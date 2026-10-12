@echo off
cd /d "%~dp0"
start "" http://localhost:8765/
echo Higher Self is running at http://localhost:8765/
echo Leave this window open. On your phone, open that address then Add to Home Screen.
echo Close this window to stop.
python -m http.server 8765
if errorlevel 1 python3 -m http.server 8765
pause
