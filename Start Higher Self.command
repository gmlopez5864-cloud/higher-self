#!/bin/bash
cd "$(dirname "$0")"
PORT=8765
(sleep 1; open "http://localhost:$PORT/" 2>/dev/null || xdg-open "http://localhost:$PORT/" 2>/dev/null) &
echo "Higher Self is running at http://localhost:$PORT/"
echo "Leave this window open. On your phone, open that address then Add to Home Screen."
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT"
