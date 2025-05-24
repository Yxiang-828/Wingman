@echo off
echo Starting Wingman in Debug Mode...
set ELECTRON_ENABLE_LOGGING=1
set DEBUG=*
cd "C:\Users\xiang\Wingman hoster\Wingman\dist\win-unpacked"
Wingman.exe
pause
