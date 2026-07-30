@echo off
cd /d "%~dp0backend"
echo Installing backend dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed or not in PATH.
    echo Install it from https://www.python.org/downloads/
    echo Check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
echo.
echo Starting backend on http://localhost:8000
python -m uvicorn main:app --reload --port 8000
