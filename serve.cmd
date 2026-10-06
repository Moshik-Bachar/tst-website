@echo off
rem Local preview of the TST site: starts a static server on http://127.0.0.1:8765/ and opens the browser.
rem Close this window to stop the server.
cd /d "%~dp0"
start "" "http://127.0.0.1:8765/"
python -m http.server 8765 --bind 127.0.0.1
