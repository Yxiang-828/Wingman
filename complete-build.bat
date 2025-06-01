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

REM Setup portable Python environment first
echo [DEBUG] Step 4: Setting up portable Python environment...
if not exist "python-dist\python.exe" (
  echo Portable Python not found, downloading and setting up...
  call download-python.bat
  if %errorlevel% neq 0 (
    echo ERROR: Failed to setup portable Python!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
  )
) else (
  echo Portable Python already exists, verifying...
)

REM Verify portable Python works properly
echo [DEBUG] Testing portable Python functionality...
python-dist\python.exe --version
if %errorlevel% neq 0 (
  echo ERROR: Portable Python is not working correctly!
  echo Removing corrupted installation and retrying...
  if exist python-dist rmdir /s /q python-dist
  call download-python.bat
  if %errorlevel% neq 0 (
    echo ERROR: Failed to reinstall portable Python!
    pause
    exit /b 1
  )
  python-dist\python.exe --version
  if %errorlevel% neq 0 (
    echo ERROR: Portable Python still not working after reinstall!
    pause
    exit /b 1
  )
)

REM Test Python dependencies
echo [DEBUG] Testing Python dependencies...
python-dist\python.exe -c "import fastapi, uvicorn, supabase; print('All core dependencies available')"
if %errorlevel% neq 0 (
  echo ERROR: Python dependencies are missing or corrupted!
  echo Reinstalling dependencies...
  python-dist\python.exe -m pip install --force-reinstall fastapi==0.110.0 uvicorn==0.29.0 supabase==2.15.0
  if %errorlevel% neq 0 (
    echo ERROR: Failed to reinstall dependencies!
    pause
    exit /b 1
  )
)
echo [DEBUG] ✅ Portable Python environment ready

REM Install Node.js dependencies
echo [DEBUG] Step 5: Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Node.js dependencies installed

REM Apply Python 3.13 compatibility patch
echo [DEBUG] Step 6: Applying Python 3.13 compatibility...
python-dist\python.exe Wingman-backend\patch-orjson.py
if %errorlevel% neq 0 (
  echo ERROR: Failed to apply compatibility patch!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Compatibility patch applied

REM Rebuild native dependencies for Electron
echo [DEBUG] Step 7: Rebuilding native dependencies...
call npm run rebuild-sqlite
if %errorlevel% neq 0 (
  echo WARNING: SQLite rebuild failed, trying alternative...
  call npm rebuild better-sqlite3 --runtime=electron --target=27.1.3 --dist-url=https://electronjs.org/headers
)
echo [DEBUG] ✅ Native dependencies rebuilt

REM Verify backend files are properly structured for packaging
echo [DEBUG] Step 8: Verifying backend files are ready for packaging...
if not exist "Wingman-backend\main.py" (
  echo ERROR: main.py not found in Wingman-backend!
  pause
  exit /b 1
)

if not exist "Wingman-backend\.env" (
  echo ERROR: .env file not found in Wingman-backend!
  pause
  exit /b 1
)

echo [DEBUG] ✅ Backend files verified, will be packaged via extraResources

REM Build frontend
echo [DEBUG] Step 9: Building frontend...
call npm run build
if %errorlevel% neq 0 (
  echo ERROR: Frontend build failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Frontend built successfully

REM Package with Electron
echo [DEBUG] Step 10: Packaging with Electron...
call npm run electron:build:win
if %errorlevel% neq 0 (
  echo ERROR: Electron packaging failed!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Electron packaging completed

REM Create debug launcher
echo [DEBUG] Step 11: Creating debug tools...
(
  echo @echo off
  echo set ELECTRON_ENABLE_LOGGING=1
  echo cd "%CD%\dist\win-unpacked"
  echo Wingman.exe
  echo pause
) > "debug-wingman.bat"

REM Final verification - test if portable Python is properly bundled
echo [DEBUG] Step 12: Final verification...
if exist "python-dist\python.exe" (
  echo ✓ Portable Python is ready for packaging
  python-dist\python.exe -c "print('Portable Python verification: OK')"
  if %errorlevel% equ 0 (
    echo ✓ Portable Python executes correctly
  ) else (
    echo ERROR: Portable Python failed final verification!
    pause
    exit /b 1
  )
) else (
  echo ERROR: Portable Python directory is missing!
  pause
  exit /b 1
)

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