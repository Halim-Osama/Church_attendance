@echo off
title Church Attendance System
echo.
echo  ==========================================
echo   Church Attendance System - Starting...
echo  ==========================================
echo.

cd /d "%~dp0"

:: Try 'python3' first
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Found Python3. Starting server...
    python3 server.py
    goto end
)

:: Try 'python' next
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Found Python. Starting server...
    python server.py
    goto end
)

:: Try 'py' launcher (Windows Python Launcher)
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo Found py launcher. Starting server...
    py server.py
    goto end
)

:: Try common install paths
if exist "C:\Python313\python.exe" (
    echo Found Python at C:\Python313
    "C:\Python313\python.exe" server.py
    goto end
)
if exist "C:\Python312\python.exe" (
    echo Found Python at C:\Python312
    "C:\Python312\python.exe" server.py
    goto end
)
if exist "C:\Python311\python.exe" (
    echo Found Python at C:\Python311
    "C:\Python311\python.exe" server.py
    goto end
)
if exist "C:\Python310\python.exe" (
    echo Found Python at C:\Python310
    "C:\Python310\python.exe" server.py
    goto end
)
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" server.py
    goto end
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" server.py
    goto end
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" server.py
    goto end
)
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" server.py
    goto end
)

:: Python not found
echo.
echo  ==========================================
echo   ERROR: Python was not found!
echo  ==========================================
echo.
echo  Please install Python 3 from:
echo  https://www.python.org/downloads/
echo.
echo  IMPORTANT: During installation, check the box:
echo  "Add Python to PATH"
echo.
echo  After installing, close this window and
echo  double-click start.bat again.
echo.

:end
pause
