@echo off
echo Building Wingman Application...

:: Check dependencies
echo Checking dependencies...
npm install

:: Setup Python environment
echo Setting up Python environment...
call setup-env.bat

:: Build the application
echo Building the application...
npm run build

:: Package the application (Windows only)
echo Packaging the application...
npm run electron:build:win

echo Build complete! Your application is in the dist_electron directory.
pause