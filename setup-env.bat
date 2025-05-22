@echo off
echo Setting up Python environment for Wingman...

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found! Please install Python 3.13 or later.
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist Wingman-backend\.venv (
    echo Creating virtual environment...
    cd Wingman-backend
    python -m venv .venv
    cd ..
) else (
    echo Virtual environment already exists.
)

:: Activate and install dependencies
echo Installing Python dependencies...
call Wingman-backend\.venv\Scripts\activate
pip install -r Wingman-backend\requirements.txt

echo Python environment setup complete!

:: Install npm dependencies
echo Installing npm dependencies...
npm install

echo Setup complete!
echo To run the app in development mode: npm run dev:full