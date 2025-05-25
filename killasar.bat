@echo off
echo ==========================================
echo      ASAR FILE UNLOCK UTILITY
echo ==========================================
echo.

echo Step 1: Killing all related processes...
taskkill /F /IM Wingman.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
timeout /t 5 /nobreak >nul

echo Step 2: Attempting to unlock dist folder...
if exist "dist" (
    echo Removing read-only attributes...
    attrib -R -S -H dist\*.* /S /D
    
    echo Force closing any open handles...
    powershell -Command "Get-Process | Where-Object {$_.Path -like '*%CD%\dist\*'} | Stop-Process -Force" 2>nul
    
    echo Cleaning dist directory...
    rd /s /q "dist" 2>nul
    if errorlevel 1 (
        echo Standard deletion failed, trying advanced method...
        powershell -Command "Remove-Item -Path 'dist' -Recurse -Force" 2>nul
    )
)

echo Step 3: Verifying cleanup...
if exist "dist\win-unpacked\resources\app.asar" (
    echo ⚠️ app.asar still exists. May need system restart.
) else (
    echo ✅ app.asar successfully removed.
)

echo.
echo Process completed. You can now try building again.
pause