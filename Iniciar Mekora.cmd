@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar-windows.ps1" %*
if errorlevel 1 (
  echo.
  echo O Mekora nao conseguiu iniciar. A mensagem acima explica o que precisa ser corrigido.
  pause
)

