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

REM === Download portable Python ===
echo Downloading portable Python distribution...
call download-python.bat
if %errorlevel% neq 0 (
  echo ERROR: Failed to download portable Python!
  exit /b 1
)

REM === Copy backend files to bundle with the app ===
echo Preparing backend files...
xcopy Wingman-backend\*.* python-dist\backend\ /E /I /Y
xcopy Wingman-backend\.env python-dist\backend\ /Y

REM === Copy environment files ===
echo Copying environment files...
if not exist dist_electron\resources\Wingman-backend mkdir dist_electron\resources\Wingman-backend 2>nul
copy Wingman-backend\.env dist_electron\resources\Wingman-backend\ /Y

REM === Package the application ===
echo Packaging the application for Windows...
npm run electron:build:win

echo.
echo Build complete! Your application is in the dist directory.
echo You can now distribute the installer from the dist folder.
pause
endlocal
