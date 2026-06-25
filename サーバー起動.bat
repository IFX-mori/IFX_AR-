@echo off
chcp 932 > nul
echo.
echo Starting AR Navigation HTTPS Server...
echo.
cd /d "%~dp0"
python https_server.py
pause
