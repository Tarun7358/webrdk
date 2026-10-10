@echo off
title RAGE Cloud 24/7 Backend and Tunnel Runner
color 0A

echo ===================================================
echo     Starting RAGE Cloud Backend and Tunnel (24/7)
echo ===================================================
echo.

cd /d "%~dp0apps\api"

if not exist ".venv\Scripts\python.exe" goto :create_venv
goto :check_cloudflared

:create_venv
echo [INFO] Virtual environment not found. Creating .venv...
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt

:check_cloudflared
set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if exist "%CLOUDFLARED%" goto :launch

set "CLOUDFLARED=C:\Program Files\cloudflared\cloudflared.exe"
if exist "%CLOUDFLARED%" goto :launch

set "CLOUDFLARED=cloudflared"

:launch
echo [1/2] Starting FastAPI Backend on port 8000...
start "RAGE API Server" cmd /k "title RAGE API Server && cd /d "%~dp0apps\api" && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Waiting for server to initialize...
ping 127.0.0.1 -n 4 >nul

echo.
echo ===============================================================
echo  Cloudflare Tunnel is now launching!
echo  Look for the link with "https://....trycloudflare.com"
echo  Copy that URL to update your Netlify VITE_API_URL!
echo ===============================================================
echo.

"%CLOUDFLARED%" tunnel --url http://localhost:8000

echo.
echo ===============================================================
echo  Tunnel stopped. Press any key to close.
echo ===============================================================
pause
