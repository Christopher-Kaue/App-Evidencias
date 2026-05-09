@echo off
REM Next + API PHP sem npm.ps1 (Execution Policy no PowerShell).
cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" scripts\dev-local.mjs
  exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado no PATH nem em Program Files.
  pause
  exit /b 1
)

node scripts\dev-local.mjs
if errorlevel 1 pause
exit /b %ERRORLEVEL%
