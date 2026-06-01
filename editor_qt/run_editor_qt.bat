@echo off
REM ============================================================
REM  GalEngine Editor (PyQt5) - Launcher Script
REM
REM  REQUIRES: Python 3.8 + PyQt5
REM  Location: D:\Anaconda3\envs\mypytorch\python.exe
REM ============================================================

set PYTHON=D:\Anaconda3\envs\mypytorch\python.exe

if not exist "%PYTHON%" (
    echo [ERROR] Python 3.8 not found at: %PYTHON%
    echo Please install PyQt5 in D:\Anaconda3\envs\mypytorch
    echo Or edit this script to point to your Python 3.8+PyQt5 environment.
    pause
    exit /b 1
)

echo Launching GalEngine Editor (PyQt5)...
echo Python: %PYTHON%
echo Editor: editor_qt/main.py
echo.

cd /d "%~dp0.."
"%PYTHON%" -m editor_qt.main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Editor exited with code %errorlevel%
    pause
)
