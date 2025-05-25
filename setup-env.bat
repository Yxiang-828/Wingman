@echo off
echo Setting up Python environment for Wingman...

:: Check if Python is installed (try both python and py commands)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    echo ✅ Using Python Launcher: py
) else (
    echo ❌ Python Launcher not found!
    exit /b 1
)

:: Create virtual environment
cd Wingman-backend
%PYTHON_CMD% -m venv .venv
cd ..

:: Install dependencies
call Wingman-backend\.venv\Scripts\activate
pip install -r Wingman-backend\requirements.txt

echo Python environment setup complete!

:: Install npm dependencies
echo Installing npm dependencies...
npm install

echo Setup complete!
echo To run the app in development mode: npm run dev:full