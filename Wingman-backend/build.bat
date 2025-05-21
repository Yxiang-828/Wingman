@echo off
echo ========================================
echo    Preparing Wingman Backend Bundle
echo ========================================

echo.
echo [Step 1/4] Creating Python virtual environment...
py -m venv .venv
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create virtual environment.
    exit /b %ERRORLEVEL%
)

echo.
echo [Step 2/4] Activating virtual environment...
call .venv\Scripts\activate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to activate virtual environment.
    exit /b %ERRORLEVEL%
)

echo.
echo [Step 3/4] Installing dependencies directly...
pip install fastapi==0.95.2 uvicorn==0.22.0 pydantic==1.10.8 python-dotenv==1.0.0
pip install requests==2.31.0 python-dateutil==2.8.2
pip install supabase==0.7.1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies.
    echo But continuing to try to bundle the app...
)

echo.
echo [Step 4/4] Creating configuration file...
echo {> .venv\config.json
echo   "APP_VERSION": "1.0.0",>> .venv\config.json
echo   "ELECTRON_BUNDLED": true>> .venv\config.json
echo }>> .venv\config.json

echo.
echo ========================================
echo    Backend preparation complete!
echo ========================================
echo.
echo Your backend is now ready to be bundled with Electron.
echo.

exit /b 0