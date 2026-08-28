# Elden Ring Boss Tracker - Overview

This repository contains two cooperating parts:

- A lightweight Web UI (Boss Tracker) that displays boss progress and receives events, plus a stream overlay (`frontend/overlay`) that mirrors the same progress for OBS.
- A screen-based detector using OCR (`backend/death_detector`) that detects deaths, the active boss name, and boss kills - all from screen pixels.

The components communicate over a local WebSocket bridge; the web UI listens and reacts to the events described below.


## Design notes

- The detector is read-only and does not touch the game process or memory - it only reads screen pixels (like any streamer death counter), so it is intended to be anti-cheat-safe.
- Boss kills are read from the golden "GEGNER GEFALLEN" / "GROSSER GEGNER GEFALLEN" banner the game shows on a kill. The banner doesn't name the boss, so the kill is credited to the currently active boss (the name read above the health bar). No per-boss setup is needed; if no active boss is known the kill is ignored and you can tick it off manually in the UI.

## Event types (all on `ws://127.0.0.1:8777`)

- `{type: "death"}` - a death detected by OCR. The web UI calls `registerDeath()`.
- `{type: "active_boss", boss: "Name"}` - active boss detected from the healthbar OCR; used to attribute subsequent deaths/kills automatically.
- `{type: "kill", boss: "Name"}` - the kill banner was detected; the web UI calls `registerBossKill()` for the active boss.

## Quickstart - Web UI

Run the bundled server (standard library only, no extra deps). It serves the
web app and persists progress to a JSON file on disk:

```bash
python3 backend/server.py
# open http://127.0.0.1:8000 in your browser
```

Options: `--port 9000`, `--data /path/to/progress.json` (default
`backend/data/progress.json`). Ctrl+C to stop.

## Persistence

- Progress is stored on disk by the server (`backend/data/progress.json`) and
  survives clearing the browser cache; it is shared across browsers on the same
  machine. The file is git-ignored.
- The web app also keeps a `localStorage` copy as an offline cache. When the
  server is reachable the disk store is the source of truth and every change is
  mirrored to it; on first run an existing localStorage copy seeds the file.
- You can still open the static files without the server (e.g.
  `python3 -m http.server`), in which case progress lives only in localStorage.

## Stream Overlay (frontend/overlay)

A transparent overlay for OBS that mirrors the tracker's progress (deaths, boss
completion, pinned bosses, timer) with kill animations. It is a read-only view
of the same on-disk store, served by the same server.

### OBS setup

- Add a Browser Source pointing at `http://127.0.0.1:8000/overlay/`.
- Display modes are chosen via URL parameters, so you can add several sources:
  - `…/overlay/` - normal scrolling boss list.
  - `…/overlay/?view=simple` - compact view (header + pinned bosses only).
  - `…/overlay/?mode=top` - Top 10 most-died bosses.
- Individual widgets can be toggled from the tracker's editor toolbox (the
  "Overlay" panel: deaths, progress, pinned, boss list, victory animation).
  These settings are saved with the progress and the overlay follows live.
- The same widgets can also be overridden per OBS source via URL params
  (a URL param wins over the toolbox setting), default all on,
  e.g. `…/overlay/?timer=0&pinned=0`:
  - `deaths=0` hide the total-deaths counter
  - `progress=0` hide the boss-progress counter
  - `timer=0` hide the timer
  - `pinned=0` hide the pinned-bosses section
  - `list=0` hide the scrolling boss list
  - `victory=0` disable the boss-kill victory animation
- Content and filters always mirror the tracker UI live: toggle Base/DLC, the
  open/done filters, pin a boss, or start the timer in the tracker and the
  overlay follows within ~1.5s.
- Files: `frontend/overlay/index.html` (markup) + `overlay.css` + `overlay.js`.

## Data flow (important)

The overlay does not talk to the detector directly. The chain is:

```
detector (ws 8777) → tracker page (attributes the event, saves progress)
                   → server (progress.json) → overlay (polls /api/progress)
```

So for automatic live updates the tracker page must be open somewhere (a
background tab is fine) - it holds the attribution logic; the detector alone
does not write progress. Manual edits in the tracker show up in the overlay too.

## Death Detector (backend/death_detector)

### Requirements

- Python 3.9+ and the Python dependencies listed in `backend/requirements.txt`.
- Tesseract OCR with the German and English language packs installed (`deu` + `eng`; `eng` ships with Tesseract by default).

Install Python deps:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd death_detector
```

### Tesseract

Install Tesseract (for Windows use the UB-Mannheim build) and ensure the German language data (`deu`) is installed; `eng` is normally bundled already. Either add the `tesseract` binary to your PATH or set the `tesseract_cmd` option in `backend/death_detector/config.json` to the full executable path.

The death and kill-banner text (`phrases`/`felled_phrases` in config.json) are only matched in German — if you play with an English game client, the death/kill banners won't be detected, but active-boss detection (the health-bar name) recognizes both English and German boss names. Boss names are English by default in `frontend/data/bosses.js` (the canonical name used by the UI, localStorage and the detector); `window.BOSS_ALIASES` at the bottom of that file carries the matching German name per boss purely so the OCR detector also recognizes a German game client.

### Configure capture regions

The detector samples a band of the screen by default. To capture a screenshot for tuning:

```bash
python death_detector.py --shot    # saves screenshot.png
```

Edit `backend/death_detector/config.json` and set `region` (left, top, width, height) and `healthbar_region` if necessary. Use `--test` to validate OCR output:

```bash
python death_detector.py --test    # prints OCR results and saves test images
```

### Run the detector

```bash
python death_detector.py
```

The detector opens a WebSocket (default `ws://127.0.0.1:8777`) and emits `{type: "death"}`, `{type: "active_boss", boss}` and `{type: "kill", boss}` events. Use `--test` to check the death and kill banner detection plus the active-boss read in one shot.

### Configuration

- `backend/death_detector/config.json`: capture regions, OCR language, thresholds and cooldowns. Relevant kill keys:
  - `detect_kills`: turn boss-kill detection on/off.
  - `felled_phrases` / `felled_key_token`: the kill-banner text to match (German defaults: `GEGNER GEFALLEN`, key token `GEFALLEN`).
  - `felled_match_min_ratio`, `kill_cooldown_seconds`, `felled_gate_dark_ratio`, `felled_gate_gold_ratio`: matching/gating tuning.

### Troubleshooting

- "Tesseract not found": install Tesseract and ensure `tesseract_cmd` or PATH is correct.
- No deaths detected: run `--test` during a visible death screen, lower `match_min_ratio`, or widen `region`.
- Kills not detected: run `--test` while the "GEGNER GEFALLEN" banner is on screen; lower `felled_match_min_ratio` or `felled_gate_gold_ratio` if the gate misses it.
- Kill detected but not attributed: make sure the active boss is set (the health-bar name was read, or pick it manually in the UI) before the banner appears.
- False positives: increase the relevant `*_match_min_ratio` or tighten the region.
- Active boss flicker: increase `active_boss_confirm_frames` in `backend/death_detector/config.json`.

### Integration notes

- The detector is optional: the web UI works with or without it and reconnects every few seconds if it is offline.
- Death and kill attribution to a boss works best when an active boss is set (automatically by the detector or manually via the UI).

