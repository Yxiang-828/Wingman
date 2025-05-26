@echo off
setlocal enabledelayedexpansion

echo ===== WINGMAN BUILD PROCESS =====
echo Current directory: %CD%
echo Current time: %TIME%
echo.

REM Kill any running processes
echo [DEBUG] Step 1: Cleanup processes...
taskkill /f /im "Wingman.exe" 2>nul || echo No Wingman.exe found
taskkill /f /im "python.exe" 2>nul || echo No Python processes found
taskkill /F /IM electron.exe /T 2>nul || echo No Electron processes found
taskkill /F /IM node.exe /T 2>nul || echo No Node processes found
timeout /t 2 /nobreak >nul

REM Free port 8080 explicitly
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul || echo No process using port 8080
)

REM Clean build files
echo [DEBUG] Step 2: Cleaning build files...
if exist dist rmdir /s /q dist
if exist python-dist rmdir /s /q python-dist

REM Check environment files
echo [DEBUG] Step 3: Checking environment files...
if not exist ".env" (
  echo ERROR: .env file not found in root directory!
  echo Create .env with: VITE_SUPABASE_URL and VITE_SUPABASE_KEY
  pause
  exit /b 1
)

if not exist "Wingman-backend\.env" (
  echo ERROR: .env file not found in Wingman-backend directory!
  echo Create Wingman-backend\.env with: SUPABASE_URL and SUPABASE_KEY
  pause
  exit /b 1
)

REM Install Node.js dependencies
echo [DEBUG] Step 4: Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Node.js dependencies installed

REM Setup Python environment
echo [DEBUG] Step 5: Setting up Python environment...
if not exist "Wingman-backend\.venv" (
  echo Creating Python virtual environment...
  cd Wingman-backend
  python -m venv .venv
  cd ..
)

REM Install Python dependencies
echo [DEBUG] Installing Python dependencies...
call Wingman-backend\.venv\Scripts\activate
cd Wingman-backend
pip install -r requirements.txt
cd ..
echo [DEBUG] ✅ Python environment ready

REM Create compatibility patch
echo [DEBUG] Step 6: Creating Python 3.13 compatibility...
if not exist "Wingman-backend\patch-orjson.py" (
  (
    echo import sys, json, types
    echo orjson = types.ModuleType('orjson'^)
    echo def dumps^(obj, **kwargs^): return json.dumps^(obj^).encode^('utf-8'^)
    echo def loads^(obj^): return json.loads^(obj.decode^('utf-8'^) if isinstance^(obj, bytes^) else obj^)
    echo orjson.dumps, orjson.loads = dumps, loads
    echo sys.modules['orjson'] = orjson
    echo print^("orjson compatibility patch loaded"^)
  ) > "Wingman-backend\patch-orjson.py"
)
echo [DEBUG] ✅ Compatibility patch created

REM Prepare backend for packaging
echo [DEBUG] Step 7: Preparing backend files...
if not exist "python-dist" mkdir "python-dist"
robocopy Wingman-backend python-dist\backend /E /XO /NDL /NJH /NJS
echo [DEBUG] ✅ Backend files prepared

REM Build frontend
echo [DEBUG] Step 8: Building frontend...
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Frontend build failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Frontend built successfully

REM Package with Electron
echo [DEBUG] Step 9: Packaging with Electron...
call npm run electron:build:win
if %errorlevel% neq 0 (
  echo ERROR: Electron packaging failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Electron packaging completed

REM Create debug launcher
echo [DEBUG] Step 10: Creating debug tools...
(
  echo @echo off
  echo set ELECTRON_ENABLE_LOGGING=1
  echo cd "%CD%\dist\win-unpacked"
  echo Wingman.exe
  echo pause
) > "debug-wingman.bat"

echo.
echo ✅ BUILD COMPLETE!
echo.
echo Your files:
if exist "dist\win-unpacked\Wingman.exe" echo ✓ Portable: dist\win-unpacked\Wingman.exe
if exist "dist\Wingman Setup 1.0.0.exe" echo ✓ Installer: dist\Wingman Setup 1.0.0.exe
echo ✓ Debug: debug-wingman.bat
echo.
echo If app doesn't start, run debug-wingman.bat for details!
pause
endlocal