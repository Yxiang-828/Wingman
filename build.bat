@echo off
setlocal enabledelayedexpansion

REM Navigate to script directory
cd /d "%~dp0"
echo Building Wingman Application...
echo.

REM === Check .env files ===
echo Checking environment files...
if not exist ".env" (
  echo ERROR: .env file not found in root directory!
  echo Please create a .env file with your Supabase credentials.
  exit /b 1
)

if not exist "Wingman-backend\.env" (
  echo ERROR: .env file not found in Wingman-backend directory!
  echo Please create a .env file with your Supabase credentials.
  exit /b 1
)

REM === Install Node.js dependencies ===
echo Checking dependencies...
call npm install
if %errorlevel% neq 0 (
  echo ERROR: npm install failed!
  exit /b 1
)

REM === Setup Python environment ===
echo Setting up Python environment...
call setup-env.bat
if %errorlevel% neq 0 (
  echo ERROR: Python environment setup failed!
  exit /b 1
)

REM === Build the frontend ===
echo Building the frontend application...
call npm run build 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Frontend build failed with code %errorlevel%!
  pause
  exit /b 1
)

REM Move this BEFORE the packaging step
echo Copying environment files...
mkdir dist_electron\resources\Wingman-backend 2>nul
copy Wingman-backend\.env dist_electron\resources\Wingman-backend\ /Y

REM Package the application (Windows only)
echo Packaging the application for Windows...
npm run electron:build:win
if %errorlevel% neq 0 (
  echo ERROR: Packaging failed!
  pause
  exit /b 1
)

REM === Done ===
echo.
echo Build complete! Your application is in the dist_electron directory.
echo You can now distribute the installer from the dist_electron folder.
pause
endlocal
