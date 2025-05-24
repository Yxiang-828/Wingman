@echo off
setlocal enabledelayedexpansion

echo ===== WINGMAN BUILD PROCESS =====
echo.

REM Kill any running Wingman processes
echo Checking for running Wingman processes...
taskkill /f /im "Wingman.exe" 2>nul || echo No Wingman.exe found
taskkill /f /im "Wingman Setup 1.0.0.exe" 2>nul || echo No installer found
taskkill /f /im "python.exe" 2>nul || echo No Python processes found
timeout /t 3 /nobreak >nul

REM Clean up previous build files with aggressive retry
echo Cleaning previous build files...
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

REM === Check .env files ===
echo Checking environment files...
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

REM Validate environment variables
echo Validating environment variables...
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

REM === Install Node.js dependencies ===
echo Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: npm install failed!
  echo Trying to fix package-lock issues...
  if exist package-lock.json del package-lock.json
  if exist node_modules rmdir /s /q node_modules
  call npm install
  if %errorlevel% neq 0 (
    pause
    exit /b 1
  )
)

REM Check and install missing dependencies
echo Checking for missing dependencies...
npm list react-calendar >nul 2>&1 || (
  echo Installing react-calendar...
  npm install react-calendar
)

npm list react-intersection-observer >nul 2>&1 || (
  echo Installing react-intersection-observer...
  npm install react-intersection-observer
)

npm list lucide-react >nul 2>&1 || (
  echo Installing lucide-react...
  npm install lucide-react
)

REM === Setup Python environment ===
echo Setting up Python environment...
call setup-env.bat
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: Python environment setup failed!
  pause
  exit /b 1
)

REM === Download portable Python 3.13 ===
echo Downloading portable Python distribution...
call download-python.bat
if %errorlevel% neq 0 (
  echo ⚠️  WARNING: Portable Python download failed, using system Python
)

REM === Ensure patch-orjson.py exists ===
echo Ensuring Python 3.13 compatibility patch exists...
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

REM === Prepare backend files ===
echo Preparing backend files for packaging...
if exist python-dist\backend rmdir /s /q python-dist\backend
xcopy Wingman-backend\*.* python-dist\backend\ /E /I /Y
xcopy Wingman-backend\.env python-dist\backend\ /Y

REM === Ensure responses.py exists ===
if not exist "python-dist\backend\app\core" mkdir "python-dist\backend\app\core"
if exist "Wingman-backend\app\core\responses.py" (
  copy "Wingman-backend\app\core\responses.py" "python-dist\backend\app\core\"
)

REM === Test backend imports ===
echo Testing backend startup capability...
cd python-dist\backend 2>nul || cd Wingman-backend
if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe -c "import main; print('Backend imports successful')" || (
    echo WARNING: Backend has import issues but continuing...
  )
) else (
  echo WARNING: Virtual environment not found, using system Python
)
cd ..\.. 2>nul || cd ..

REM === Build frontend ===
echo Building frontend application...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: Frontend build failed!
  echo.
  echo Common fixes:
  echo 1. Check for missing dependencies above
  echo 2. Verify all imports in TypeScript files
  echo 3. Check for syntax errors in component files
  echo.
  pause
  exit /b 1
)

REM === Package with Electron ===
echo Packaging application with Electron...
call npm run electron:build:win
if %errorlevel% neq 0 (
  echo.
  echo ❌ ERROR: Electron packaging failed!
  echo.
  echo Check the error messages above for specific issues.
  echo Common causes:
  echo - Missing dist folder from frontend build
  echo - Electron builder configuration problems  
  echo - Insufficient disk space
  echo.
  pause
  exit /b 1
)

echo.
echo ✅ BUILD COMPLETE!
echo.
echo Your application files:
if exist "dist\win-unpacked\Wingman.exe" (
  echo ✓ Portable app: dist\win-unpacked\Wingman.exe
)
if exist "dist\Wingman Setup 1.0.0.exe" (
  echo ✓ Installer: dist\Wingman Setup 1.0.0.exe
)
echo.
echo You can now test your application!
pause
endlocal