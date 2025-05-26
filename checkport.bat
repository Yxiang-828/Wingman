@echo off
:: filepath: c:\Users\xiang\PIG\Wingman\check-port.bat
echo ==========================================
echo    PORT 8080 USAGE CHECKER (ADVANCED)
echo ==========================================
echo.

:: Get process info with PID for port 8080
echo CHECKING PORT USAGE WITH NETSTAT...
netstat -ano | findstr :8080
if %ERRORLEVEL% NEQ 0 (
    echo PORT 8080 IS FREE! No processes found.
    goto :END
)

:: Get more detailed process info
echo.
echo PROCESS DETAILS:
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo Process ID: %%a
    echo Command: 
    tasklist /fi "pid eq %%a" /fo list /v
    echo.
)

echo.
echo If you see "No tasks running with the specified criteria", the process might be running as system
echo or the port might be in TIME_WAIT state. Try the kill-port.bat script.

:END
echo.
echo Process completed.
pause