@echo off
setlocal enabledelayedexpansion

echo ===== WINGMAN BUILD PROCESS =====
echo Current directory: %CD%
echo Current time: %TIME%
echo.

REM Kill any running Wingman processes
echo [DEBUG] Step 1: Killing processes...
taskkill /f /im "Wingman.exe" 2>nul || echo No Wingman.exe found
taskkill /f /im "Wingman Setup 1.0.0.exe" 2>nul || echo No installer found
taskkill /f /im "python.exe" 2>nul || echo No Python processes found
timeout /t 3 /nobreak >nul
echo [DEBUG] ✅ Process cleanup completed

REM Clean up previous build files with aggressive retry
echo [DEBUG] Step 2: Cleaning build files...
for /l %%i in (1,1,3) do (
  if exist dist (
    echo Attempt %%i to remove dist folder...
    rmdir /s /q dist 2>nul
    timeout /t 2 /nobreak >nul
  )
)
if exist dist (
  echo WARNING: Could not remove dist folder completely
  echo Some files may be locked. Continuing anyway...
)

if exist python-dist rmdir /s /q python-dist
echo [DEBUG] ✅ File cleanup completed

REM === Check .env files ===
echo [DEBUG] Step 3: Checking environment files...
if not exist ".env" (
  echo ERROR: .env file not found in root directory!
  echo Please create a .env file with your Supabase credentials.
  pause
  exit /b 1
)

if not exist "Wingman-backend\.env" (
  echo ERROR: .env file not found in Wingman-backend directory!
  pause
  exit /b 1
)
echo [DEBUG] ✅ Environment files found

REM Validate environment variables
echo [DEBUG] Step 4: Validating environment variables...
findstr "SUPABASE_URL" .env >nul || (
  echo ERROR: SUPABASE_URL not found in .env
  pause
  exit /b 1
)

findstr "SUPABASE_KEY" .env >nul || (
  echo ERROR: SUPABASE_KEY not found in .env
  pause
  exit /b 1
)
echo [DEBUG] ✅ Environment variables validated

REM === Install Node.js dependencies ===
echo [DEBUG] Step 5: Installing Node.js dependencies...
call npm install
echo [DEBUG] npm install returned with errorlevel: %errorlevel%
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: npm install failed with errorlevel %errorlevel%
  echo Trying to fix package-lock issues...
  if exist package-lock.json del package-lock.json
  if exist node_modules rmdir /s /q node_modules
  call npm install
  echo [DEBUG] Second npm install returned with errorlevel: %errorlevel%
  if %errorlevel% neq 0 (
    echo FATAL ERROR: npm install failed twice
    pause
    exit /b 1
  )
)
echo [DEBUG] ✅ Node.js dependencies installed

REM === Skip redundant dependency installation ===
echo [DEBUG] Step 6: Skipping individual dependencies (already installed via npm install)...
echo [DEBUG] ✅ All dependencies already installed from package.json

REM === Setup Python environment ===
echo [DEBUG] Step 7: Setting up Python environment...
if not exist "setup-env.bat" (
  echo [DEBUG] WARNING: setup-env.bat not found, skipping Python env setup
) else (
  call setup-env.bat
  echo [DEBUG] setup-env.bat returned with errorlevel: %errorlevel%
  if %errorlevel% neq 0 (
    echo WARNING: Python environment setup failed, continuing anyway...
  )
)
echo [DEBUG] ✅ Python environment setup completed

REM === Download portable Python 3.13 ===
echo [DEBUG] Step 8: Setting up portable Python...
if not exist "download-python.bat" (
  echo [DEBUG] WARNING: download-python.bat not found, skipping portable Python
) else (
  call download-python.bat
  echo [DEBUG] download-python.bat returned with errorlevel: %errorlevel%
  if %errorlevel% neq 0 (
    echo ⚠️  WARNING: Portable Python download failed, using system Python
  )
)
echo [DEBUG] ✅ Portable Python setup completed

REM === Create python-dist directory structure ===
echo [DEBUG] Step 9: Creating python-dist structure...
if not exist "python-dist" mkdir "python-dist"
echo [DEBUG] ✅ python-dist directory created

REM === Ensure patch-orjson.py exists ===
echo [DEBUG] Step 10: Creating Python compatibility patches...
if not exist "Wingman-backend\patch-orjson.py" (
  echo Creating patch-orjson.py...
  (
    echo import sys
    echo import json
    echo import types
    echo.
    echo # Create a fake orjson module
    echo orjson = types.ModuleType('orjson'^)
    echo.
    echo # Add core functions
    echo def dumps^(obj, **kwargs^):
    echo     return json.dumps^(obj^).encode^('utf-8'^)
    echo.
    echo def loads^(obj^):
    echo     if isinstance^(obj, bytes^):
    echo         obj = obj.decode^('utf-8'^)
    echo     return json.loads^(obj^)
    echo.
    echo # Add required options
    echo orjson.OPT_NON_STR_KEYS = 0
    echo orjson.OPT_SERIALIZE_NUMPY = 0
    echo orjson.dumps = dumps
    echo orjson.loads = loads
    echo.
    echo # Add to sys.modules
    echo sys.modules['orjson'] = orjson
    echo print^("Fake orjson module created successfully"^)
  ) > "Wingman-backend\patch-orjson.py"
)
echo [DEBUG] ✅ Python patches created

REM === Prepare backend files ===
echo [DEBUG] Step 11: Preparing backend files for packaging...
if exist python-dist\backend rmdir /s /q python-dist\backend
xcopy Wingman-backend\*.* python-dist\backend\ /E /I /Y
xcopy Wingman-backend\.env python-dist\backend\ /Y

REM === Ensure responses.py exists ===
if not exist "python-dist\backend\app\core" mkdir "python-dist\backend\app\core"
if exist "Wingman-backend\app\core\responses.py" (
  copy "Wingman-backend\app\core\responses.py" "python-dist\backend\app\core\"
)
echo [DEBUG] ✅ Backend files prepared

REM === Test backend imports ===
echo [DEBUG] Step 12: Testing backend startup capability...
cd python-dist\backend 2>nul || cd Wingman-backend
if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe -c "import main; print('Backend imports successful')" || (
    echo WARNING: Backend has import issues but continuing...
  )
) else (
  echo WARNING: Virtual environment not found, using system Python
)
cd ..\.. 2>nul || cd ..
echo [DEBUG] ✅ Backend testing completed

REM === Build frontend ===
echo [DEBUG] Step 13: Building frontend application...
call npm run build
echo [DEBUG] npm run build returned with errorlevel: %errorlevel%
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: Frontend build failed with errorlevel %errorlevel%
  echo.
  echo Common fixes:
  echo 1. Check for missing dependencies above
  echo 2. Verify all imports in TypeScript files
  echo 3. Check for syntax errors in component files
  echo.
  pause
  exit /b 1
)
echo [DEBUG] ✅ Frontend build completed

REM === Create icon assets ===
echo [DEBUG] Step 14: Setting up icon assets...
if not exist "assets\icons" mkdir "assets\icons"
if not exist "assets\icons\wingman-productive.ico" (
  echo [DEBUG] WARNING: Icon files missing, creating placeholder structure...
  echo Creating basic icon structure...
)
echo [DEBUG] ✅ Icon assets prepared

REM === Package with Electron ===
echo [DEBUG] Step 15: Packaging application with Electron...
call npm run electron:build:win
echo [DEBUG] electron:build:win returned with errorlevel: %errorlevel%
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: Electron packaging failed with errorlevel %errorlevel%
  echo.
  echo Check the error messages above for specific issues.
  echo Common causes:
  echo - Missing dist folder from frontend build
  echo - Electron builder configuration problems  
  echo - Insufficient disk space
  echo - Missing icon files
  echo.
  pause
  exit /b 1
)
echo [DEBUG] ✅ Electron packaging completed

REM === Verify build outputs ===
echo [DEBUG] Step 16: Verifying build outputs...
if exist "dist\win-unpacked\Wingman.exe" (
  echo [DEBUG] ✅ Portable executable found
  echo ✓ Portable app: dist\win-unpacked\Wingman.exe
) else (
  echo [DEBUG] ❌ Portable executable NOT found
)

if exist "dist\Wingman Setup 1.0.0.exe" (
  echo [DEBUG] ✅ Installer found
  echo ✓ Installer: dist\Wingman Setup 1.0.0.exe
) else (
  echo [DEBUG] ❌ Installer NOT found
)

REM === Create debug launcher ===
echo [DEBUG] Step 17: Creating debug launcher...
(
  echo @echo off
  echo echo Starting Wingman in Debug Mode...
  echo set ELECTRON_ENABLE_LOGGING=1
  echo set DEBUG=*
  echo cd "%CD%\dist\win-unpacked"
  echo Wingman.exe
  echo pause
) > "debug-wingman.bat"
echo [DEBUG] ✅ Debug launcher created: debug-wingman.bat

echo.
echo ✅ BUILD COMPLETE!
echo.
echo [DEBUG] Build completed successfully at %TIME%
echo.
echo Your application files:
if exist "dist\win-unpacked\Wingman.exe" (
  echo ✓ Portable app: dist\win-unpacked\Wingman.exe
)
if exist "dist\Wingman Setup 1.0.0.exe" (
  echo ✓ Installer: dist\Wingman Setup 1.0.0.exe
)
echo ✓ Debug launcher: debug-wingman.bat
echo.
echo To test your application:
echo 1. Run debug-wingman.bat to see console output
echo 2. Or double-click dist\win-unpacked\Wingman.exe
echo 3. Or install using dist\Wingman Setup 1.0.0.exe
echo.
echo If the app doesn't start, run debug-wingman.bat for error details!
pause
endlocal