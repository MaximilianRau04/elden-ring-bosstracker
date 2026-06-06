@echo off
REM Start the save watcher to monitor for save file changes and trigger updates in the boss tracker.
cd /d "%~dp0"
python save_watcher.py
pause
