# Elden Ring Boss Tracker - Overview

This repository contains two cooperating parts:

- A lightweight Web UI (Boss Tracker) that displays boss progress and receives events.
- A screen-based detector using OCR (`backend/death_detector`) that detects deaths, the active boss name, and boss kills — all from screen pixels.

The components communicate over a local WebSocket bridge; the web UI listens and reacts to the events described below.


Design notes

- The detector is read-only and does not touch the game process or memory - it only reads screen pixels (like any streamer death counter), so it is intended to be anti-cheat-safe.
- Boss kills are read from the golden "GEGNER GEFALLEN" / "GROSSER GEGNER GEFALLEN" banner the game shows on a kill. The banner doesn't name the boss, so the kill is credited to the currently active boss (the name read above the health bar). No per-boss setup is needed; if no active boss is known the kill is ignored and you can tick it off manually in the UI.

Event types (all on `ws://127.0.0.1:8777`)

- `{type: "death"}` - a death detected by OCR. The web UI calls `registerDeath()`.
- `{type: "active_boss", boss: "Name"}` - active boss detected from the healthbar OCR; used to attribute subsequent deaths/kills automatically.
- `{type: "kill", boss: "Name"}` - the kill banner was detected; the web UI calls `registerBossKill()` for the active boss.

Quickstart - Web UI (static)

1. From the repository root run a simple HTTP server:

```bash
python3 -m http.server 8000
# open http://localhost:8000 in your browser
```

If you move frontend files to `ui/` run the server from that folder instead.

Death Detector (backend/death_detector)

Requirements

- Python 3.9+ and the Python dependencies listed in `backend/death_detector/requirements.txt`.
- Tesseract OCR with the German language pack installed.

Install Python deps:

```bash
cd backend/death_detector
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Tesseract

Install Tesseract (for Windows use the UB-Mannheim build) and ensure the German language data (`deu`) is installed. Either add the `tesseract` binary to your PATH or set the `tesseract_cmd` option in `backend/death_detector/config.json` to the full executable path.

Configure capture regions

The detector samples a band of the screen by default. To capture a screenshot for tuning:

```bash
python death_detector.py --shot    # saves screenshot.png
```

Edit `backend/death_detector/config.json` and set `region` (left, top, width, height) and `healthbar_region` if necessary. Use `--test` to validate OCR output:

```bash
python death_detector.py --test    # prints OCR results and saves test images
```

Run the detector

```bash
python death_detector.py
```

The detector opens a WebSocket (default `ws://127.0.0.1:8777`) and emits `{type: "death"}`, `{type: "active_boss", boss}` and `{type: "kill", boss}` events. Use `--test` to check the death and kill banner detection plus the active-boss read in one shot.

Configuration

- `backend/death_detector/config.json`: capture regions, OCR language, thresholds and cooldowns. Relevant kill keys:
  - `detect_kills`: turn boss-kill detection on/off.
  - `felled_phrases` / `felled_key_token`: the kill-banner text to match (German defaults: `GEGNER GEFALLEN`, key token `GEFALLEN`).
  - `felled_match_min_ratio`, `kill_cooldown_seconds`, `felled_gate_dark_ratio`, `felled_gate_gold_ratio`: matching/gating tuning.

Troubleshooting

- "Tesseract not found": install Tesseract and ensure `tesseract_cmd` or PATH is correct.
- No deaths detected: run `--test` during a visible death screen, lower `match_min_ratio`, or widen `region`.
- Kills not detected: run `--test` while the "GEGNER GEFALLEN" banner is on screen; lower `felled_match_min_ratio` or `felled_gate_gold_ratio` if the gate misses it.
- Kill detected but not attributed: make sure the active boss is set (the health-bar name was read, or pick it manually in the UI) before the banner appears.
- False positives: increase the relevant `*_match_min_ratio` or tighten the region.
- Active boss flicker: increase `active_boss_confirm_frames` in `backend/death_detector/config.json`.

Integration notes

- The detector is optional: the web UI works with or without it and reconnects every few seconds if it is offline.
- Death and kill attribution to a boss works best when an active boss is set (automatically by the detector or manually via the UI).

