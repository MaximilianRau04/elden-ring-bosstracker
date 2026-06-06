#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════
#  ELDEN RING — DEATH DETECTOR (OCR)
#
#  Watches the screen for the German death banner "DU BIST GESTORBEN" and
#  emits one death event per occurrence over a local WebSocket. The Boss
#  Tracker web app connects to that socket and calls ERTracker.registerDeath().
#
#  This only reads pixels from the screen (like any streamer death counter),
#  so it is anti-cheat safe. It never touches the game process or memory.
#
#  Usage:
#    python death_detector.py            # run the detector + WebSocket server
#    python death_detector.py --test     # grab one frame, print OCR, save debug
#    python death_detector.py --shot      # save a full screenshot for region setup
#    python death_detector.py --region "L T W H"   # override capture region once
# ═══════════════════════════════════════════════════════════════════════════

import argparse
import asyncio
import difflib
import json
import os
import re
import sys
import threading
import time

import numpy as np

try:
    import cv2
    import mss
    import pytesseract
    import websockets
except ImportError as e:
    sys.exit(
        "Missing dependency: %s\n"
        "Install everything with:  pip install -r requirements.txt" % e.name
    )

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")
BOSSES_JS = os.path.normpath(os.path.join(HERE, "..", "..", "frontend", "data", "bosses.js"))


# ─── Config ──────────────────────────────────────────────────────────────────
def load_config():
    cfg = {
        "websocket_host": "127.0.0.1",
        "websocket_port": 8777,
        "monitor": 1,
        "region": None,
        "capture_fps": 3,
        "death_cooldown_seconds": 6.0,
        "phrases": ["DU BIST GESTORBEN"],
        "key_token": "GESTORBEN",
        "match_min_ratio": 0.8,
        "ocr_lang": "deu",
        "tesseract_cmd": None,
        "gate_dark_ratio": 0.5,
        "gate_red_ratio": 0.0015,
        # Active-boss detection (reads the boss name above its health bar).
        "detect_active_boss": True,
        "healthbar_region": None,
        "active_boss_min_ratio": 0.72,
        "active_boss_confirm_frames": 2,
        "hb_gate_text_min": 0.001,
        "hb_gate_text_max": 0.5,
        "debug": False,
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception as e:
            print("[config] could not read config.json: %s" % e)
    return cfg


def resolve_tesseract(cfg):
    """Point pytesseract at the Tesseract binary (auto-detect on Windows)."""
    if cfg.get("tesseract_cmd"):
        pytesseract.pytesseract.tesseract_cmd = cfg["tesseract_cmd"]
        return
    if os.name == "nt":
        for guess in (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ):
            if os.path.exists(guess):
                pytesseract.pytesseract.tesseract_cmd = guess
                return


# ─── Screen capture ──────────────────────────────────────────────────────────
def auto_region(monitor):
    """A centered band where the death banner appears (~middle of the screen)."""
    left = monitor["left"] + int(monitor["width"] * 0.20)
    top = monitor["top"] + int(monitor["height"] * 0.36)
    width = int(monitor["width"] * 0.60)
    height = int(monitor["height"] * 0.24)
    return {"left": left, "top": top, "width": width, "height": height}


def auto_region_healthbar(monitor):
    """A strip near the bottom where the boss name sits above its health bar."""
    left = monitor["left"] + int(monitor["width"] * 0.20)
    top = monitor["top"] + int(monitor["height"] * 0.83)
    width = int(monitor["width"] * 0.60)
    height = int(monitor["height"] * 0.075)
    return {"left": left, "top": top, "width": width, "height": height}


def grab(sct, region):
    shot = sct.grab(region)
    # mss returns BGRA; drop alpha -> BGR for OpenCV
    return np.array(shot)[:, :, :3]


# ─── Detection ───────────────────────────────────────────────────────────────
def redness(img_bgr):
    b, g, r = cv2.split(img_bgr.astype("int16"))
    red = np.clip(r - (g + b) // 2, 0, 255).astype("uint8")
    return red


def looks_like_death(img_bgr, cfg):
    """Cheap pre-gate so we only run OCR when a death screen is plausible.

    The death screen darkens everything and shows dark-red text."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    dark_ratio = float((gray < 70).mean())
    red_ratio = float((redness(img_bgr) > 45).mean())
    return dark_ratio >= cfg["gate_dark_ratio"] and red_ratio >= cfg["gate_red_ratio"]


def clean_text(t):
    return re.sub(r"[^A-ZÄÖÜ ]", "", t.upper()).strip()


def phrase_score(text, cfg):
    c = clean_text(text)
    if not c:
        return 0.0, c
    best = 0.0
    for p in cfg["phrases"]:
        pu = clean_text(p)
        if pu and pu in c:
            return 1.0, c
        best = max(best, difflib.SequenceMatcher(None, pu, c).ratio())
    key = clean_text(cfg["key_token"])
    if key:
        if key in c:
            return 1.0, c
        for word in c.split():
            best = max(best, difflib.SequenceMatcher(None, key, word).ratio())
    return best, c


def ocr_variants(img_bgr):
    """Yield a couple of preprocessed binary images good for OCR."""
    red = redness(img_bgr)
    red = cv2.normalize(red, None, 0, 255, cv2.NORM_MINMAX)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    for src in (red, gray):
        big = cv2.resize(src, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        _, th = cv2.threshold(big, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Text can come out as white-on-black or black-on-white; OCR wants
        # dark text on light background, so try the binary and its inverse.
        yield th
        yield cv2.bitwise_not(th)


def detect_death(img_bgr, cfg):
    """Return (is_death, best_ratio, best_text)."""
    if not looks_like_death(img_bgr, cfg):
        return False, 0.0, ""
    lang = cfg["ocr_lang"]
    best_ratio, best_text = 0.0, ""
    for variant in ocr_variants(img_bgr):
        txt = pytesseract.image_to_string(variant, lang=lang, config="--psm 7")
        ratio, cleaned = phrase_score(txt, cfg)
        if ratio > best_ratio:
            best_ratio, best_text = ratio, cleaned
        if best_ratio >= 1.0:
            break
    return best_ratio >= cfg["match_min_ratio"], best_ratio, best_text


# ─── Active boss (boss health-bar name) ────────────────────────────────────────
def norm_name(s):
    """Letters only, uppercase — robust key for fuzzy name comparison."""
    return re.sub(r"[^A-ZÄÖÜ]", "", s.upper())


def load_boss_variants():
    """Read boss names from bosses.js → [(canonical, [normalized variants])].

    Multi-phase entries like "Bestienkleriker / Maliketh, …" are also split on
    / + & so a health bar that only shows one phase still matches."""
    if not os.path.exists(BOSSES_JS):
        print("[boss] bosses.js not found at %s — active-boss detection off."
              % BOSSES_JS)
        return []
    try:
        with open(BOSSES_JS, "r", encoding="utf-8") as f:
            txt = f.read()
    except Exception as e:
        print("[boss] could not read bosses.js: %s" % e)
        return []
    start = txt.find("BOSS_DATA")
    if start != -1:
        txt = txt[start:]
    raw = re.findall(r'"((?:[^"\\]|\\.)+)"', txt)
    names = [n for n in raw if n not in ("area", "isDLC", "bosses")]
    variants, seen = [], set()
    for n in names:
        if n in seen:
            continue
        seen.add(n)
        vs = []
        for part in [n] + re.split(r"[/+&]", n):
            nn = norm_name(part)
            if len(nn) >= 4:
                vs.append(nn)
        vs = list(dict.fromkeys(vs))  # dedupe, keep order
        if vs:
            variants.append((n, vs))
    return variants


def match_boss_name(text, variants, min_ratio):
    """Fuzzy-match OCR text against the boss list. Returns (canonical|None, ratio)."""
    o = norm_name(text)
    if len(o) < 4:
        return None, 0.0
    best_name, best = None, 0.0
    for name, vs in variants:
        for v in vs:
            if len(v) >= 5 and (v in o or o in v):
                r = 1.0
            else:
                r = difflib.SequenceMatcher(None, v, o).ratio()
            if r > best:
                best, best_name = r, name
    return (best_name, best) if best >= min_ratio else (None, best)


def hb_gate(img_bgr, cfg):
    """Cheap gate: skip OCR on pure-dark (no UI) and pure-bright (open field)
    frames; the boss name is light text on a darker strip."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    bright = float((gray > 160).mean())
    return cfg["hb_gate_text_min"] <= bright <= cfg["hb_gate_text_max"]


def boss_name_images(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    big = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    _, th = cv2.threshold(big, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    yield th
    yield cv2.bitwise_not(th)


def detect_boss_name(img_bgr, cfg, variants):
    """Return (canonical_name|None, best_ratio, raw_text)."""
    if not variants or not hb_gate(img_bgr, cfg):
        return None, 0.0, ""
    lang = cfg["ocr_lang"]
    min_ratio = cfg["active_boss_min_ratio"]
    best_name, best_ratio, best_text = None, 0.0, ""
    for variant in boss_name_images(img_bgr):
        txt = pytesseract.image_to_string(variant, lang=lang, config="--psm 7").strip()
        name, ratio = match_boss_name(txt, variants, min_ratio)
        if ratio > best_ratio:
            best_ratio, best_text, best_name = ratio, txt, name
        if name and ratio >= 0.95:
            break
    return best_name, best_ratio, best_text


# ─── WebSocket server ────────────────────────────────────────────────────────
class Bridge:
    """Tiny broadcast hub: detector thread -> connected browser clients."""

    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.loop = None
        self.clients = set()
        self.last_active = None  # last detected active boss (for reconnect sync)

    async def _handler(self, ws):
        self.clients.add(ws)
        addr = getattr(ws, "remote_address", "?")
        print("[ws] client connected (%s) — %d total" % (addr, len(self.clients)))
        try:
            if self.last_active:
                await ws.send(json.dumps({"type": "active_boss",
                                          "boss": self.last_active}))
            await ws.wait_closed()
        finally:
            self.clients.discard(ws)
            print("[ws] client disconnected — %d total" % len(self.clients))

    async def _serve(self):
        self.loop = asyncio.get_running_loop()
        async with websockets.serve(self._handler, self.host, self.port):
            print("[ws] listening on ws://%s:%d" % (self.host, self.port))
            await asyncio.Future()  # run forever

    def run_forever(self):
        asyncio.run(self._serve())

    async def _send(self, payload):
        if not self.clients:
            return
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)

    def broadcast(self, obj):
        """Thread-safe broadcast from the detector thread."""
        if self.loop is None:
            return
        payload = json.dumps(obj)
        asyncio.run_coroutine_threadsafe(self._send(payload), self.loop)


# ─── Detector loop ───────────────────────────────────────────────────────────
def detector_loop(cfg, bridge, region_override=None, variants=None):
    interval = 1.0 / max(1, cfg["capture_fps"])
    cooldown = cfg["death_cooldown_seconds"]
    deaths = 0
    last_death_ts = 0.0
    banner_visible = False  # edge-trigger: count only on the rising edge

    hb_enabled = bool(cfg.get("detect_active_boss")) and bool(variants)
    confirm = max(1, int(cfg.get("active_boss_confirm_frames", 2)))
    pending_name, pending_count, current_active = None, 0, None

    with mss.mss() as sct:
        monitor = sct.monitors[cfg["monitor"]]
        region = region_override or cfg.get("region") or auto_region(monitor)
        hb_region = cfg.get("healthbar_region") or auto_region_healthbar(monitor)
        print("[capture] death region: %s" % region)
        print("[detector] watching for 'DU BIST GESTORBEN' … (Ctrl+C to stop)")
        if hb_enabled:
            print("[capture] boss-name region: %s" % hb_region)
            print("[detector] active-boss detection on (%d bosses known)"
                  % len(variants))

        while True:
            t0 = time.time()
            frame = grab(sct, region)
            is_death, ratio, text = detect_death(frame, cfg)

            if cfg.get("debug") and ratio > 0.4:
                print("[debug] death ratio=%.2f text=%r" % (ratio, text))

            now = time.time()
            if is_death:
                if not banner_visible and (now - last_death_ts) >= cooldown:
                    deaths += 1
                    last_death_ts = now
                    print("[death] #%d detected (match=%.2f, '%s')"
                          % (deaths, ratio, text))
                    bridge.broadcast({"type": "death", "ts": now, "count": deaths})
                banner_visible = True
            else:
                banner_visible = False

            # ── active boss: read the name above the health bar ──
            if hb_enabled:
                hb_frame = grab(sct, hb_region)
                name, hb_ratio, hb_text = detect_boss_name(hb_frame, cfg, variants)
                if cfg.get("debug") and hb_ratio > 0.5:
                    print("[debug] boss ratio=%.2f name=%r text=%r"
                          % (hb_ratio, name, hb_text))
                if name:
                    if name == pending_name:
                        pending_count += 1
                    else:
                        pending_name, pending_count = name, 1
                    if pending_count >= confirm and name != current_active:
                        current_active = name
                        bridge.last_active = name
                        print("[boss] active boss: %s (match=%.2f)" % (name, hb_ratio))
                        bridge.broadcast({"type": "active_boss", "boss": name,
                                          "ts": now})
                else:
                    # no bar / no match → keep the current active boss, reset pending
                    pending_name, pending_count = None, 0

            sleep = interval - (time.time() - t0)
            if sleep > 0:
                time.sleep(sleep)


# ─── One-shot helpers ────────────────────────────────────────────────────────
def save_full_screenshot(cfg):
    with mss.mss() as sct:
        monitor = sct.monitors[cfg["monitor"]]
        img = grab(sct, monitor)
    path = os.path.join(HERE, "screenshot.png")
    cv2.imwrite(path, img)
    print("Saved %s (%dx%d). Use it to set \"region\" [L,T,W,H] in config.json."
          % (path, monitor["width"], monitor["height"]))


def run_test(cfg, region_override=None):
    variants = load_boss_variants()
    with mss.mss() as sct:
        monitor = sct.monitors[cfg["monitor"]]
        region = region_override or cfg.get("region") or auto_region(monitor)
        hb_region = cfg.get("healthbar_region") or auto_region_healthbar(monitor)
        frame = grab(sct, region)
        hb_frame = grab(sct, hb_region)
    cv2.imwrite(os.path.join(HERE, "test_region.png"), frame)
    cv2.imwrite(os.path.join(HERE, "test_healthbar.png"), hb_frame)

    gate = looks_like_death(frame, cfg)
    is_death, ratio, text = detect_death(frame, cfg)
    print("death region : %s" % region)
    print("pre-gate hit : %s" % gate)
    print("death match  : %.2f  text=%r" % (ratio, text))
    print("=> DEATH" if is_death else "=> no death")

    print("\nboss region  : %s" % hb_region)
    if cfg.get("detect_active_boss"):
        hgate = hb_gate(hb_frame, cfg)
        name, hb_ratio, hb_text = detect_boss_name(hb_frame, cfg, variants)
        print("hb-gate hit  : %s" % hgate)
        print("boss match   : %.2f  text=%r" % (hb_ratio, hb_text))
        print("=> active boss: %s" % (name or "(none)"))
    else:
        print("active-boss detection disabled in config.")

    print("\nSaved test_region.png + test_healthbar.png — check the death text "
          "and the boss name each fit inside their box.")


def parse_region(s):
    parts = [int(x) for x in re.split(r"[ ,]+", s.strip()) if x != ""]
    if len(parts) != 4:
        raise ValueError("region needs 4 numbers: 'left top width height'")
    return {"left": parts[0], "top": parts[1], "width": parts[2], "height": parts[3]}


def main():
    ap = argparse.ArgumentParser(description="Elden Ring death detector (OCR).")
    ap.add_argument("--test", action="store_true", help="single frame, print OCR")
    ap.add_argument("--shot", action="store_true", help="save a full screenshot")
    ap.add_argument("--region", help="override region: 'left top width height'")
    args = ap.parse_args()

    cfg = load_config()
    resolve_tesseract(cfg)
    region_override = parse_region(args.region) if args.region else None

    # Fail fast with a friendly message if Tesseract is not reachable.
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        sys.exit(
            "Tesseract OCR not found.\n"
            "Install it (Windows): https://github.com/UB-Mannheim/tesseract/wiki\n"
            "Pick the German language data during setup, then either add it to PATH\n"
            "or set \"tesseract_cmd\" in config.json to tesseract.exe."
        )

    if args.shot:
        save_full_screenshot(cfg)
        return
    if args.test:
        run_test(cfg, region_override)
        return

    variants = load_boss_variants() if cfg.get("detect_active_boss") else []
    bridge = Bridge(cfg["websocket_host"], cfg["websocket_port"])
    t = threading.Thread(target=detector_loop,
                         args=(cfg, bridge, region_override, variants),
                         daemon=True)
    t.start()
    try:
        bridge.run_forever()
    except KeyboardInterrupt:
        print("\n[exit] stopped.")


if __name__ == "__main__":
    main()
