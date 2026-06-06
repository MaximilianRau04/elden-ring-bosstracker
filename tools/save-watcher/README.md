# Save Watcher - automatische Boss-Kill-Erkennung

Liest die Elden-Ring-Spielstanddatei `ER0000.sl2`, beobachtet die **Event-Flags**
und meldet jeden neu besiegten Boss über einen lokalen WebSocket an den Boss
Tracker. Die Webseite ruft dann automatisch `registerBossKill(name)` auf und
hakt den Boss ab.

Gegenstück zum [death-detector](../death-detector/): der erkennt **Tode** per
Bildschirm-OCR, dieser hier erkennt **Kills** aus dem Spielstand.

## Wie es funktioniert (und warum es anti-cheat-sicher ist)

- Die `.sl2` ist ein AES-verschlüsseltes BND4-Archiv. Das Tool entschlüsselt sie
  mit dem öffentlich bekannten Elden-Ring-Key - genau das, was jedes Backup-/
  Save-Tool auch macht. Die Datei wird **nur gelesen**, nie zurückgeschrieben,
  und der Spielprozess/Arbeitsspeicher wird **nie** angefasst.
- Ob ein Boss tot ist, steht als einzelnes Bit (Event-Flag) im Spielstand.
  Welches Bit zu welchem Boss gehört, ist nirgends sauber dokumentiert - deshalb
  bringst du es dem Tool **einmal pro Boss selbst bei** (`--scan`): Es vergleicht
  den Spielstand vor und nach dem Kill und findet das Flag, das umgekippt ist.

## Installation

```bash
pip install -r requirements.txt
```

Keine externen Programme nötig (anders als beim death-detector, der Tesseract
braucht).

## 1. Spielstand finden & Entschlüsselung prüfen

```bash
python save_watcher.py --info
```

Findet automatisch `%APPDATA%\EldenRing\<steam-id>\ER0000.sl2` und zeigt die
Slots an. Wichtig: bei den **benutzten** Slots muss `checksum=ok` stehen - dann
stimmt die Entschlüsselung. Steht da `MISMATCH`, ist etwas faul (falsche Datei).

Findet das Tool die Datei nicht, trag den Pfad in `config.json` unter
`save_path` ein. Wenn du mehrere Charaktere hast, setz `slot` auf die richtige
Slot-Nummer aus der `--info`-Ausgabe.

## 2. Bossen ihr Flag beibringen (`--scan`)

Für jeden Boss, den du automatisch abhaken willst, einmal:

```bash
python save_watcher.py --scan "Margit, das Grausame Mal"
```

Ablauf:

1. Stell dich **vor** den Boss (noch nicht töten) → ENTER (Vorher-Snapshot).
2. Das Tool wartet kurz still und lernt, welche Bits nur „Rauschen" sind
   (Spielzeit, Position …).
3. **Töte den Boss**, warte auf die Runen-Belohnung **und einen Speichervorgang**
   (Autosave-Symbol oben rechts, oder kurz an einem Ort der Gnade rasten) →
   ENTER (Nachher-Snapshot).
4. Das umgekippte Flag wird erkannt und in `boss_flags.json` gespeichert.

> Tipp: Zwischen den beiden Snapshots **so wenig wie möglich** sonst tun (kein
> Loot aufheben, keine Menüs). Je weniger sich ändert, desto eindeutiger das
> Flag. Findet `--scan` zu viele Kandidaten, einfach wiederholen.

Den exakten Bossnamen am besten aus der App / `bosses.js` kopieren — bei einem
unbekannten Namen warnt `--scan` und schlägt ähnliche vor.

Verwaltung der gelernten Flags:

```bash
python save_watcher.py --list             # alle Mappings anzeigen
python save_watcher.py --forget "Margit, das Grausame Mal"
```

## 3. Watcher starten

```bash
python save_watcher.py
```

(oder unter Windows `run.bat` doppelklicken). Der WebSocket-Server lauscht auf
`ws://127.0.0.1:8778`. Lass ihn neben dem Spiel laufen — sobald der Spielstand
sich ändert und ein gelerntes Boss-Flag gesetzt wird, wird der Boss in der App
abgehakt.

Beim Verbinden schickt der Watcher außerdem einmal die **bereits besiegten**
Bosse (`sync`), sodass eine frisch geladene Seite sofort aufholt. Das setzt
Bosse nur auf „besiegt", entfernt nie etwas.

## Zusammenspiel

- `death-detector` (Port 8777) → `{type:"death"}` → `registerDeath()`
- `save-watcher`   (Port 8778) → `{type:"kill", boss}` / `{type:"sync", bosses}` → `registerBossKill()`

Beide Tools sind optional und unabhängig. Läuft eins nicht, versucht die Seite
still alle 4 s neu zu verbinden — sonst passiert nichts.

## Grenzen

- Erkennt **Kills**, keinen „gerade aktiven Boss". Die Zuordnung von Toden zum
  richtigen Boss passiert über den im Tracker aktiven Boss bzw. manuell.
- Funktioniert nur für Bosse mit einem stabilen Event-Flag (praktisch alle
  echten Bosse). Reine Feld-Mobs ohne Flag lassen sich nicht zuverlässig lernen.
- Spielstand-Layout kann sich mit großen Patches ändern; falls `--info` dann
  `MISMATCH` zeigt, ist der AES-Key/Aufbau betroffen (selten).
