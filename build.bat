@echo off
echo Building Wingman Application...

REM Check env files first
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

REM Check dependencies
echo Checking dependencies...
npm install

REM Setup Python environment
echo Setting up Python environment...
call setup-env.bat
if %errorlevel% neq 0 (
  echo Python environment setup failed!
  exit /b 1
)

REM Build the application
echo Building the frontend application...
npm run build
if %errorlevel% neq 0 (
  echo Frontend build failed!
  exit /b 1
)

REM Package the application (Windows only)
echo Packaging the application for Windows...
npm run electron:build:win
if %errorlevel% neq 0 (
  echo Packaging failed!
  exit /b 1
)

echo Build complete! Your application is in the dist_electron directory.
echo.
echo You can now distribute the installer from dist_electron folder.
pause