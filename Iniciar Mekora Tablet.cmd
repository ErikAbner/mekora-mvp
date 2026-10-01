@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\iniciar-windows.ps1" -Tablet %*
if errorlevel 1 pause
