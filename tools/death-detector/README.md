# Elden Ring - Death Detector (OCR)

Watches the screen and sends two kinds of events over a local WebSocket; the
Boss Tracker web app connects to that socket and reacts automatically:

1. **Death** - the German death banner **"DU BIST GESTORBEN"** → counts a death
   (`{type:"death"}` → `registerDeath()`).
2. **Active boss** - the **boss name above its health bar** → sets that boss as
   the active one (`{type:"active_boss", boss}` → `setActiveBoss()`), so the next
   detected death is attributed to the right boss automatically.

It only reads pixels from the screen (like any streamer overlay), so it is
**anti-cheat safe** - it never reads or writes the game process or memory.

> Active-boss detection makes death attribution hands-off, but OCR isn't perfect:
> the German boss name is fuzzy-matched against `bosses.js`, which works for the
> vast majority of named bosses. The manual "active boss" control in the web app
> stays available as a fallback/override. A defeated boss is released
> automatically (the save-watcher's kill event clears it).

## 1. Install

**Python 3.9+** plus the packages:

```bash
pip install -r requirements.txt
```

**Tesseract OCR** (the OCR engine) - Windows build:
<https://github.com/UB-Mannheim/tesseract/wiki>

During setup, tick the **German** language data ("Deutsch"). After installing,
either add Tesseract to your PATH or set `"tesseract_cmd"` in `config.json` to,
e.g., `C:\\Program Files\\Tesseract-OCR\\tesseract.exe`.

## 2. Set the capture region (recommended)

The detector defaults to a centered band of monitor 1. To make it precise:

```bash
python death_detector.py --shot     # saves screenshot.png of your full screen
```

Open `screenshot.png`, read off where the death text sits, and put
`"region": [left, top, width, height]` into `config.json`. Verify it:

```bash
python death_detector.py --test     # prints the OCR result, saves test_region.png
```

Best run `--test` once while an actual death screen is visible (or against a
screenshot of one) so you can confirm the match. `--test` also saves
`test_healthbar.png` and prints the boss-name detection - run it during a boss
fight to confirm the **boss-name region** (the strip near the bottom of the
screen). If the name doesn't fit, set `"healthbar_region": [left, top, width,
height]` in `config.json`.

## 3. Run

```bash
python death_detector.py            # or double-click run.bat on Windows
```

You should see `ws listening on ws://127.0.0.1:8777`. Open the Boss Tracker in
your browser - it connects automatically and shows a toast on each detected
death. Multiple monitors / resolutions: set `"monitor"` and `"region"` in
`config.json`.

## config.json

| key | meaning |
|-----|---------|
| `websocket_host` / `websocket_port` | where the bridge listens (must match the tracker, default `127.0.0.1:8777`) |
| `monitor` | mss monitor index (1 = primary) |
| `region` | `[left, top, width, height]` or `null` for the auto centered band |
| `capture_fps` | screen checks per second (3 is plenty) |
| `death_cooldown_seconds` | min seconds between two counted deaths |
| `phrases` / `key_token` | text to match (`DU BIST GESTORBEN` / `GESTORBEN`) |
| `match_min_ratio` | fuzzy-match threshold 0–1 (lower = more lenient) |
| `ocr_lang` | Tesseract language (`deu`) |
| `tesseract_cmd` | full path to tesseract.exe, or `null` to auto-detect |
| `gate_dark_ratio` / `gate_red_ratio` | cheap pre-filter so OCR only runs on plausible death frames |
| `detect_active_boss` | read the boss name above its health bar and auto-set the active boss (default `true`) |
| `healthbar_region` | `[left, top, width, height]` for the boss-name strip, or `null` for the auto bottom band |
| `active_boss_min_ratio` | fuzzy-match threshold for boss names 0–1 (default `0.72`) |
| `active_boss_confirm_frames` | same name needed on N frames before switching (anti-flicker, default `2`) |
| `hb_gate_text_min` / `hb_gate_text_max` | brightness band gate so boss-name OCR skips pure-dark / pure-bright frames |
| `debug` | print every near-match (death + boss name) for tuning |

## Troubleshooting

- **"Tesseract OCR not found"** → install it / set `tesseract_cmd`.
- **No deaths detected** → run `--test` during a death; lower `match_min_ratio`
  (e.g. 0.7) or widen the `region`; set `"debug": true` to see raw matches.
- **False positives** → raise `match_min_ratio`, or tighten `region` to the text.
- **Tracker not reacting** → make sure the page is open and the port matches; the
  browser console should show the death-bridge connecting.
- **Wrong / no active boss** → run `--test` during a fight and check
  `test_healthbar.png` covers the name; lower `active_boss_min_ratio` a touch, or
  set `healthbar_region`. You can always set the active boss manually in the app.
- **Active boss flickers** → raise `active_boss_confirm_frames` (e.g. 3–4).
- **CPU usage too high** → boss-name OCR runs each frame during fights; lower
  `capture_fps`, tighten `healthbar_region`, or set `detect_active_boss: false`.
