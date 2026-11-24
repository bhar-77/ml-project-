@echo off
title ReviewIQ Launcher
echo ===================================================
echo Starting ReviewIQ - Intelligent E-Commerce Analytics
echo ===================================================
echo.

cd /d "%~dp0reviewiq"

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
start "ReviewIQ Backend (FastAPI)" cmd /k "cd backend && .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173...
start "ReviewIQ Frontend (React/Vite)" cmd /k "cd frontend && node ..\.tools\npm\package\bin\npm-cli.js run dev"

timeout /t 3 /nobreak >nul

echo.
echo ===================================================
echo Opening ReviewIQ in your default browser...
echo URL: http://localhost:5173/
echo ===================================================
start http://localhost:5173/

exit
