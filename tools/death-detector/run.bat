@echo off
REM Start the Elden Ring death detector on Windows.
cd /d "%~dp0"
python death_detector.py %*
pause
