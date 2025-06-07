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

REM Check Python 3.13 specifically
echo [DEBUG] Step 4: Checking Python 3.13...
py --version 2>&1 | findstr "3.13" >nul
if %errorlevel% neq 0 (
  echo ERROR: Python 3.13 not found!
  echo Please install Python 3.13 from python.org
  pause
  exit /b 1
)
echo [DEBUG] ✅ Python 3.13 confirmed

REM Install Node.js dependencies
echo [DEBUG] Step 5: Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Node.js dependencies installed

REM Setup Python environment
echo [DEBUG] Step 6: Setting up Python environment...
if not exist "Wingman-backend\.venv" (
  echo Creating Python virtual environment...
  cd Wingman-backend
  python -m venv .venv
  cd ..
)

REM Install Python dependencies with specific versions
echo [DEBUG] Installing Python dependencies...
call Wingman-backend\.venv\Scripts\activate
cd Wingman-backend
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo ERROR: Python dependencies failed to install!
  echo Check requirements.txt for compatibility issues
  pause
  exit /b 1
)
cd ..
echo [DEBUG] ✅ Python environment ready

REM Run orjson compatibility patch
echo [DEBUG] Step 7: Applying Python 3.13 compatibility...
cd Wingman-backend
call .venv\Scripts\activate
python patch-orjson.py
cd ..
echo [DEBUG] ✅ Compatibility patch applied

REM Rebuild native dependencies for Electron
echo [DEBUG] Step 8: Rebuilding native dependencies...
call npm run rebuild-sqlite
if %errorlevel% neq 0 (
  echo WARNING: SQLite rebuild failed, trying alternative...
  call npm rebuild better-sqlite3 --runtime=electron --target=27.1.3 --dist-url=https://electronjs.org/headers
)
echo [DEBUG] ✅ Native dependencies rebuilt

REM Prepare backend for packaging
echo [DEBUG] Step 9: Preparing backend files...
if not exist "python-dist" mkdir "python-dist"
robocopy Wingman-backend python-dist\backend /E /XO /NDL /NJH /NJS
echo [DEBUG] ✅ Backend files prepared

REM Build frontend
echo [DEBUG] Step 10: Building frontend...
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Frontend build failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Frontend built successfully

REM Package with Electron
echo [DEBUG] Step 11: Packaging with Electron...
call npm run electron:build:win
if %errorlevel% neq 0 (
  echo ERROR: Electron packaging failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Electron packaging completed

REM Create debug launcher
echo [DEBUG] Step 12: Creating debug tools...
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