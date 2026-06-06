# Elden Ring Boss Tracker - Overview

This repository contains three cooperating parts:

- A lightweight Web UI (Boss Tracker) that displays boss progress and receives events.
- A screen-based death detector using OCR (`backend/death_detector`) that detects deaths and active boss names.
- A save watcher (`backend/save_watcher`) that reads the game's save file to detect recorded boss kills.

All components communicate over local WebSocket bridges; the web UI listens and reacts to the events described below.


Design notes

- Both tools are read-only and do not modify the game process or memory - they are intended to be anti-cheat-safe. The death detector reads screen pixels; the save watcher reads the local save file but does not write it.

Event types

- `{type: "death"}` - a death detected by the OCR detector. The web UI calls `registerDeath()`.
- `{type: "active_boss", boss: "Name"}` - active boss detected from the healthbar OCR; used to attribute subsequent deaths automatically.
- `{type: "kill", boss: "Name"}` - emitted by the save watcher when a learned flag flips; the web UI calls `registerBossKill()`.
- `{type: "sync", bosses: [...]}` - initial sync from save watcher listing already defeated bosses.

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

The detector opens a WebSocket (default `ws://127.0.0.1:8777`) and emits `{type: "death"}` and `{type: "active_boss", boss}` events.

Save Watcher (backend/save_watcher)

Requirements

- Python 3.9+ and the dependencies from `backend/save_watcher/requirements.txt`.

Install and run

```bash
cd backend/save_watcher
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python save_watcher.py --info   # detect save locations and verify decryption
```

Teach the watcher a boss flag

To learn the flag for a boss (run once per boss):

```bash
python save_watcher.py --scan "Margit, the Fell Omen"
```

Follow the on-screen instructions: take a before snapshot (ENTER), kill the boss and wait for autosave, then press ENTER again. The flag is saved to `boss_flags.json`.

Run the watcher

```bash
python save_watcher.py
```

The watcher opens a WebSocket (default `ws://127.0.0.1:8778`) and sends `{type: "kill", boss}` and `{type: "sync", bosses}` messages.

Configuration

- `backend/death_detector/config.json`: capture regions, OCR language, thresholds (`match_min_ratio`, cooldowns, monitor index, etc.).
- `backend/save_watcher/config.json`: `save_path`, `slot`, and other options. Use `--info` to auto-detect saves.

Troubleshooting

- "Tesseract not found": install Tesseract and ensure `tesseract_cmd` or PATH is correct.
- No deaths detected: run `--test` during a visible death screen, lower `match_min_ratio`, or widen `region`.
- False positives: increase `match_min_ratio` or tighten the region.
- Active boss flicker: increase `active_boss_confirm_frames` in `backend/death_detector/config.json`.
- Save watcher shows `MISMATCH` in `--info`: the save decryption failed (wrong file or layout changed).

Integration notes

- Both tools are optional: the web UI will work with either, both, or none. The UI will try reconnecting every few seconds if a tool is offline.
- Death attribution to a boss works best when an active boss is set (either automatically by the death detector or manually via the UI).

