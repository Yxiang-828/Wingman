@echo off
:: filepath: c:\Users\xiang\PIG\Wingman\kill-port.bat
setlocal enabledelayedexpansion
echo ==========================================
echo    PORT 8080 KILLER (NUCLEAR OPTION)
echo ==========================================
echo.

:: Get process info with PID for port 8080
echo STEP 1: IDENTIFYING PROCESSES ON PORT 8080...
set "found_process=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo Found process with PID: %%a
    set "pid=%%a"
    set "found_process=1"
    
    echo Attempting to kill process %%a...
    taskkill /F /PID %%a
    if !ERRORLEVEL! EQU 0 (
        echo Successfully terminated process %%a
    ) else (
        echo Failed to terminate process %%a, attempting with elevated privileges...
        echo This will require administrator rights.
        powershell -Command "Start-Process cmd -ArgumentList '/c taskkill /F /PID %%a' -Verb RunAs"
    )
)

if %found_process% EQU 0 (
    echo No active listening processes found on port 8080.
    echo The port might be in TIME_WAIT state. Attempting alternative methods...
)

echo.
echo STEP 2: CHECKING FOR ORPHANED TIME_WAIT CONNECTIONS...
netstat -ano | findstr :8080
if %ERRORLEVEL% NEQ 0 (
    echo Great! No connections found on port 8080.
) else (
    echo Found remaining connections on port 8080.
    echo Attempting to reset all TCP connections (requires admin privileges)...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh int ip reset' -Verb RunAs"
    echo Please restart your computer for changes to take effect.
)

echo.
echo STEP 3: NUCLEAR OPTION - KILLING ALL PYTHON PROCESSES...
echo WARNING: This will kill ALL Python processes on your system.
echo Press Ctrl+C to abort or any key to continue...
pause > nul
taskkill /F /IM python.exe /T
taskkill /F /IM pythonw.exe /T
taskkill /F /IM py.exe /T

echo.
echo STEP 4: VERIFYING PORT AVAILABILITY...
timeout /t 2 > nul
netstat -ano | findstr :8080
if %ERRORLEVEL% NEQ 0 (
    echo SUCCESS! Port 8080 is now available.
) else (
    echo Port 8080 is still in use. A system restart may be required.
)

echo.
echo Process completed.
pause