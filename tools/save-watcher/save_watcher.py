#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════
#  ELDEN RING — SAVE WATCHER (boss-kill detector)
#
#  Reads the encrypted save file ER0000.sl2, watches the per-character event
#  flags, and emits one "kill" event per newly-defeated boss over a local
#  WebSocket. The Boss Tracker web app connects to that socket and calls
#  ERTracker.registerBossKill(name).
#
#  This only READS the save file on disk and decrypts it with the publicly
#  known Elden Ring save key (the same thing every save manager / backup tool
#  does). It never touches the game process or memory, so it is anti-cheat
#  safe as long as you run it while the game is closed OR only read (we never
#  write the save back).
#
#  Which bit means which boss is not hard-coded — you teach it once with the
#  --scan mode (kill the boss, the tool finds the flag that flipped).
#
#  Usage:
#    python save_watcher.py                      # watch + WebSocket server
#    python save_watcher.py --info               # show slots / decryption check
#    python save_watcher.py --scan "Bossname"    # learn the flag for one boss
#    python save_watcher.py --list               # list learned boss mappings
#    python save_watcher.py --forget "Bossname"  # remove a learned mapping
# ═══════════════════════════════════════════════════════════════════════════

import argparse
import asyncio
import glob
import hashlib
import json
import os
import re
import sys
import threading
import time

try:
    from Crypto.Cipher import AES  # pycryptodome
    import websockets
except ImportError as e:
    sys.exit(
        "Missing dependency: %s\n"
        "Install everything with:  pip install -r requirements.txt" % e.name
    )

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")
FLAGS_PATH = os.path.join(HERE, "boss_flags.json")
BOSSES_JS = os.path.normpath(os.path.join(HERE, "..", "..", "bosses.js"))

# Publicly known Elden Ring save AES-128-CBC key (used by every save tool).
ER_KEY = bytes(
    [0x18, 0xF6, 0x32, 0x66, 0x05, 0xBD, 0x17, 0x8A,
     0x55, 0x24, 0x52, 0x3A, 0xC0, 0xA0, 0xC6, 0x09]
)

# A character slot decrypts to this many bytes; the menu/global entry is
# smaller. We use the size to tell the 10 slots apart from the rest.
SLOT_DATA_SIZE = 0x280010  # 2_621_456


# ─── Config & learned flags ───────────────────────────────────────────────────
def load_config():
    cfg = {
        "websocket_host": "127.0.0.1",
        "websocket_port": 8778,
        "save_path": None,       # null -> auto-detect from %APPDATA%
        "slot": None,            # null -> auto-detect the used slot
        "poll_seconds": 3.0,
        "scan_settle_seconds": 4.0,
        "sync_on_connect": True,
        "debug": False,
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception as e:
            print("[config] could not read config.json: %s" % e)
    return cfg


def load_mappings():
    if not os.path.exists(FLAGS_PATH):
        return []
    try:
        with open(FLAGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("mappings", [])
    except Exception as e:
        print("[flags] could not read boss_flags.json: %s" % e)
        return []


def save_mappings(mappings):
    data = {
        "_comment": "Learned boss -> event-flag bit mappings. "
                    "Populated by `python save_watcher.py --scan \"Boss Name\"`.",
        "mappings": mappings,
    }
    with open(FLAGS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_boss_names():
    """Best-effort list of valid boss names from bosses.js (for typo warnings)."""
    if not os.path.exists(BOSSES_JS):
        return []
    try:
        with open(BOSSES_JS, "r", encoding="utf-8") as f:
            txt = f.read()
        start = txt.find("BOSS_DATA")
        if start != -1:
            txt = txt[start:]
        names = re.findall(r'"((?:[^"\\]|\\.)+)"', txt)
        # drop the structural keys
        skip = {"area", "isDLC", "bosses"}
        return [n for n in names if n not in skip]
    except Exception:
        return []


# ─── Save location ─────────────────────────────────────────────────────────────
def find_save_path(cfg):
    if cfg.get("save_path"):
        return cfg["save_path"]
    appdata = os.environ.get("APPDATA")
    if appdata:
        pattern = os.path.join(appdata, "EldenRing", "*", "ER0000.sl2")
        hits = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
        if hits:
            return hits[0]
    return None


# ─── BND4 + decryption ─────────────────────────────────────────────────────────
def parse_bnd4_entries(data):
    """Return [(data_offset, size)] for every BND4 entry, in file order.

    We only need the data offset and size of each entry; both live at fixed
    positions inside the per-entry header, so we don't have to resolve the
    (format-dependent) name layout to do our job."""
    if data[:4] != b"BND4":
        raise ValueError("not a BND4 container (bad magic)")
    file_count = int.from_bytes(data[0x0C:0x10], "little")
    header_size = int.from_bytes(data[0x20:0x28], "little") or 0x24
    entries = []
    base = 0x40
    for i in range(file_count):
        off = base + i * header_size
        comp_size = int.from_bytes(data[off + 0x08:off + 0x10], "little")
        data_off = int.from_bytes(data[off + 0x18:off + 0x1C], "little")
        if 0 < data_off <= len(data) and 0 < comp_size <= len(data):
            entries.append((data_off, comp_size))
    return entries


def decrypt_entry(raw):
    """raw = [16-byte IV][AES-128-CBC ciphertext]. Returns the decrypted payload
    WITHOUT the leading 16-byte checksum, plus whether that checksum matched."""
    iv = raw[:16]
    cipher = AES.new(ER_KEY, AES.MODE_CBC, iv)
    clear = cipher.decrypt(raw[16:])
    stored = clear[:16]
    payload = clear[16:]
    ok = hashlib.md5(payload).digest() == stored
    return payload, ok


def read_slots(save_path):
    """Return list of dicts: {index, payload, checksum_ok} for the 10 char slots."""
    with open(save_path, "rb") as f:
        data = f.read()
    entries = parse_bnd4_entries(data)
    slots = []
    idx = 0
    for data_off, size in entries:
        if abs(size - SLOT_DATA_SIZE) > 0x100:
            continue  # not a character slot (menu/global entry is smaller)
        raw = data[data_off:data_off + size]
        payload, ok = decrypt_entry(raw)
        slots.append({"index": idx, "payload": payload, "checksum_ok": ok})
        idx += 1
        if idx >= 10:
            break
    return slots


def slot_looks_used(payload):
    """A fresh/empty slot is essentially uniform; a used one has real entropy."""
    sample = payload[:0x20000]
    nonzero = sum(1 for b in sample if b != 0)
    return nonzero > len(sample) * 0.05


# ─── Bit helpers ───────────────────────────────────────────────────────────────
def bit_set(payload, bit):
    byte_i = bit >> 3
    if byte_i >= len(payload):
        return False
    return (payload[byte_i] >> (bit & 7)) & 1 == 1


def diff_set_bits(before, after):
    """Bit indices that went 0 -> 1 from `before` to `after`."""
    result = []
    n = min(len(before), len(after))
    for i in range(n):
        bb, ba = before[i], after[i]
        rising = ba & ~bb
        if rising:
            for b in range(8):
                if rising & (1 << b):
                    result.append((i << 3) | b)
    return result


def diff_changed_bits(a, b):
    """Bit indices that differ between two snapshots (either direction)."""
    result = set()
    n = min(len(a), len(b))
    for i in range(n):
        x = a[i] ^ b[i]
        if x:
            for bit in range(8):
                if x & (1 << bit):
                    result.add((i << 3) | bit)
    return result


def pick_active_slot(slots, cfg):
    if cfg.get("slot") is not None:
        for s in slots:
            if s["index"] == cfg["slot"]:
                return s
    used = [s for s in slots if slot_looks_used(s["payload"])]
    if used:
        return used[0]
    return slots[0] if slots else None


# ─── WebSocket bridge ──────────────────────────────────────────────────────────
class Bridge:
    """Broadcast hub: watcher thread -> connected browser clients.

    On connect it can push a `sync` message (the bosses already defeated) so a
    freshly loaded page catches up. registerBossKill only ever sets done=true,
    so re-announcing is harmless."""

    def __init__(self, host, port, sync_provider=None):
        self.host = host
        self.port = port
        self.loop = None
        self.clients = set()
        self.sync_provider = sync_provider

    async def _handler(self, ws):
        self.clients.add(ws)
        addr = getattr(ws, "remote_address", "?")
        print("[ws] client connected (%s) — %d total" % (addr, len(self.clients)))
        try:
            if self.sync_provider:
                names = self.sync_provider()
                if names:
                    await ws.send(json.dumps({"type": "sync", "bosses": names}))
            await ws.wait_closed()
        finally:
            self.clients.discard(ws)
            print("[ws] client disconnected — %d total" % len(self.clients))

    async def _serve(self):
        self.loop = asyncio.get_running_loop()
        async with websockets.serve(self._handler, self.host, self.port):
            print("[ws] listening on ws://%s:%d" % (self.host, self.port))
            await asyncio.Future()

    def run_forever(self):
        asyncio.run(self._serve())

    async def _send(self, payload):
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)

    def broadcast(self, obj):
        if self.loop is None:
            return
        payload = json.dumps(obj)
        asyncio.run_coroutine_threadsafe(self._send(payload), self.loop)


# ─── Watch loop ────────────────────────────────────────────────────────────────
def watch_loop(cfg, bridge, save_path, mappings):
    poll = max(0.5, float(cfg["poll_seconds"]))
    slot_index = cfg.get("slot")

    def current_payload():
        slots = read_slots(save_path)
        if not slots:
            return None
        slot = None
        if slot_index is not None:
            slot = next((s for s in slots if s["index"] == slot_index), None)
        if slot is None:
            slot = pick_active_slot(slots, cfg)
        return slot["payload"] if slot else None

    def boss_defeated(payload, m):
        bits = m.get("bits") or ([m["bit"]] if "bit" in m else [])
        return bool(bits) and all(bit_set(payload, b) for b in bits)

    # initialise state so already-defeated bosses don't re-fire on startup
    payload = None
    for _ in range(20):
        payload = current_payload()
        if payload:
            break
        time.sleep(1.0)
    if not payload:
        print("[watch] could not read the save yet — will keep trying.")

    state = {}
    if payload:
        for m in mappings:
            state[m["boss"]] = boss_defeated(payload, m)
        already = [b for b, v in state.items() if v]
        print("[watch] %d boss flag(s) mapped, %d already defeated."
              % (len(mappings), len(already)))

    last_mtime = 0.0
    while True:
        try:
            mtime = os.path.getmtime(save_path)
        except OSError:
            time.sleep(poll)
            continue

        if mtime != last_mtime:
            last_mtime = mtime
            payload = current_payload()
            if payload:
                for m in mappings:
                    now = boss_defeated(payload, m)
                    if now and not state.get(m["boss"]):
                        print("[kill] %s" % m["boss"])
                        bridge.broadcast({"type": "kill", "boss": m["boss"],
                                          "ts": time.time()})
                    state[m["boss"]] = now
                if cfg.get("debug"):
                    print("[watch] save changed, re-checked %d flags" % len(mappings))
        time.sleep(poll)


def make_sync_provider(cfg, save_path, mappings):
    def provider():
        try:
            slots = read_slots(save_path)
        except Exception:
            return []
        if not slots:
            return []
        slot = pick_active_slot(slots, cfg)
        if not slot:
            return []
        payload = slot["payload"]
        out = []
        for m in mappings:
            bits = m.get("bits") or ([m["bit"]] if "bit" in m else [])
            if bits and all(bit_set(payload, b) for b in bits):
                out.append(m["boss"])
        return out
    return provider


# ─── Modes ─────────────────────────────────────────────────────────────────────
def cmd_info(cfg, save_path):
    print("save file   : %s" % save_path)
    slots = read_slots(save_path)
    if not slots:
        print("No character slots found — is this a valid ER0000.sl2?")
        return
    print("slots found : %d" % len(slots))
    for s in slots:
        used = slot_looks_used(s["payload"])
        print("  slot %d : %d bytes  checksum=%s  %s"
              % (s["index"], len(s["payload"]),
                 "ok" if s["checksum_ok"] else "MISMATCH",
                 "used" if used else "empty"))
    active = pick_active_slot(slots, cfg)
    if active:
        print("active slot : %d (override with \"slot\" in config.json)"
              % active["index"])
    if not all(s["checksum_ok"] for s in slots if slot_looks_used(s["payload"])):
        print("\n! Checksum mismatch on a used slot — decryption may be off; "
              "scanning will be unreliable.")


def cmd_scan(cfg, save_path, boss_name):
    names = load_boss_names()
    if names and boss_name not in names:
        import difflib
        close = difflib.get_close_matches(boss_name, names, n=3, cutoff=0.6)
        print("Note: \"%s\" is not an exact name in bosses.js." % boss_name)
        if close:
            print("Did you mean: %s" % ", ".join('"%s"' % c for c in close))
        print("(Continuing anyway — the web app fuzzy-matches names.)\n")

    settle = float(cfg.get("scan_settle_seconds", 4.0))

    def read_active():
        slots = read_slots(save_path)
        slot = pick_active_slot(slots, cfg)
        if not slot:
            sys.exit("Could not read an active save slot.")
        return slot

    print("Scanning flag for: %s" % boss_name)
    print("Stand right in front of the boss (do NOT kill it yet).")
    input("Press ENTER to take the BEFORE snapshot… ")
    slot = read_active()
    base_a = slot["payload"]
    print("Holding still for %.0fs to learn which bits are just noise…" % settle)
    time.sleep(settle)
    base_b = read_active()["payload"]
    noisy = diff_changed_bits(base_a, base_b)
    print("Ignoring %d noisy bit(s) (playtime, position, …)." % len(noisy))

    print("\nNow KILL the boss and wait for the rune reward.")
    input("Then press ENTER to take the AFTER snapshot… ")
    after = read_active()["payload"]

    rising = [b for b in diff_set_bits(base_a, after) if b not in noisy]
    if not rising:
        print("\nNo new flag detected. Did the kill register / did the game "
              "autosave? Try again, and make sure the game wrote the save "
              "(rest at a grace or wait for the autosave icon).")
        return
    if len(rising) > 64:
        print("\nDetected %d candidate bits — that's too noisy to be reliable. "
              "Re-run and try to change as little else as possible (don't pick "
              "up loot / open menus between snapshots)." % len(rising))
        return

    print("\nDetected %d candidate flag bit(s): %s"
          % (len(rising), rising if len(rising) <= 16 else
             str(rising[:16]) + " …"))

    mappings = load_mappings()
    mappings = [m for m in mappings if m["boss"] != boss_name]
    mappings.append({"boss": boss_name, "slot": slot["index"], "bits": rising})
    save_mappings(mappings)
    print("Saved mapping for \"%s\" (%d bits). It will fire when all of them "
          "are set." % (boss_name, len(rising)))


def cmd_list():
    mappings = load_mappings()
    if not mappings:
        print("No mappings yet. Learn one with: "
              "python save_watcher.py --scan \"Boss Name\"")
        return
    print("%d learned mapping(s):" % len(mappings))
    for m in mappings:
        bits = m.get("bits") or ([m["bit"]] if "bit" in m else [])
        print("  %-45s slot %s  %d bit(s)"
              % (m["boss"], m.get("slot", "?"), len(bits)))


def cmd_forget(boss_name):
    mappings = load_mappings()
    new = [m for m in mappings if m["boss"] != boss_name]
    if len(new) == len(mappings):
        print("No mapping named \"%s\"." % boss_name)
        return
    save_mappings(new)
    print("Removed mapping for \"%s\"." % boss_name)


def main():
    ap = argparse.ArgumentParser(description="Elden Ring boss-kill detector (save file).")
    ap.add_argument("--info", action="store_true", help="show slots / decryption check")
    ap.add_argument("--scan", metavar="BOSS", help="learn the flag for one boss")
    ap.add_argument("--list", action="store_true", help="list learned mappings")
    ap.add_argument("--forget", metavar="BOSS", help="remove a learned mapping")
    args = ap.parse_args()

    cfg = load_config()

    if args.list:
        cmd_list()
        return
    if args.forget:
        cmd_forget(args.forget)
        return

    save_path = find_save_path(cfg)
    if not save_path or not os.path.exists(save_path):
        sys.exit(
            "Could not find ER0000.sl2.\n"
            "Set \"save_path\" in config.json to your save, usually:\n"
            "  %APPDATA%\\EldenRing\\<your-steam-id>\\ER0000.sl2"
        )

    # sanity check decryption once up front
    try:
        slots = read_slots(save_path)
    except Exception as e:
        sys.exit("Failed to read/decrypt the save: %s" % e)
    if not slots:
        sys.exit("No character slots found in the save file.")

    if args.info:
        cmd_info(cfg, save_path)
        return
    if args.scan:
        cmd_scan(cfg, save_path, args.scan)
        return

    mappings = load_mappings()
    if not mappings:
        print("! No boss flags learned yet — nothing to watch.\n"
              "  Teach one with:  python save_watcher.py --scan \"Boss Name\"\n"
              "  (The server still starts so the web app can connect.)\n")

    provider = make_sync_provider(cfg, save_path, mappings) \
        if cfg.get("sync_on_connect") else None
    bridge = Bridge(cfg["websocket_host"], cfg["websocket_port"], provider)
    t = threading.Thread(target=watch_loop,
                         args=(cfg, bridge, save_path, mappings), daemon=True)
    t.start()
    print("[save-watcher] watching %s" % save_path)
    try:
        bridge.run_forever()
    except KeyboardInterrupt:
        print("\n[exit] stopped.")


if __name__ == "__main__":
    main()
