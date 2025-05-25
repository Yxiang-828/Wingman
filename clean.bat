REM filepath: c:\Users\xiang\final\Wingman\clean.bat
@echo off
echo Cleaning up build files...

REM Kill ALL processes that could lock files
taskkill /f /im "Wingman.exe" 2>nul
taskkill /f /im "electron.exe" 2>nul
taskkill /f /im "node.exe" 2>nul
timeout /t 3 /nobreak >nul

REM Clean directories with better retry logic
if exist "dist" (
    echo Removing dist folder...
    rd /s /q "dist" 2>nul || (
        echo Retrying dist deletion in 3 seconds...
        timeout /t 3 /nobreak >nul
        taskkill /f /im "Wingman.exe" 2>nul
        rd /s /q "dist" 2>nul || echo Warning: Some dist files may still be locked
    )
)

if exist "dist-electron" (
    echo Removing dist-electron folder...
    rd /s /q "dist-electron" 2>nul || (
        echo Retrying dist-electron deletion in 3 seconds...
        timeout /t 3 /nobreak >nul
        rd /s /q "dist-electron" 2>nul || echo Warning: Some dist-electron files may still be locked
    )
)

echo Cleanup complete!
pause