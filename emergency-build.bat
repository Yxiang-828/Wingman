@echo off
echo ===== EMERGENCY WINGMAN BUILD (FIXED) =====

REM Kill ALL existing processes first
echo Killing all existing Wingman processes...
taskkill /f /im "Wingman.exe" 2>nul
taskkill /f /im "python.exe" 2>nul
taskkill /f /im "electron.exe" 2>nul
taskkill /f /im "node.exe" 2>nul
timeout /t 5 /nobreak

REM Clean everything
if exist dist rmdir /s /q dist
if exist python-dist rmdir /s /q python-dist

REM Build with single-threaded npm to prevent issues
echo Building with single thread...
set NODE_OPTIONS=--max-old-space-size=4096
call npm install --no-audit --no-fund
call npm run build
call npm run electron:build:win

echo Build complete - check for single instance only!
pause