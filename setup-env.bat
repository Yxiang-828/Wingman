@echo off
echo Setting up Python environment for Wingman...

:: Check if Python is installed (try both python and py commands)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
    ) else (
        echo Python not found! Please install Python 3.13 or later.
        exit /b 1
    )
)

:: Create virtual environment if it doesn't exist
if not exist Wingman-backend\.venv (
    echo Creating virtual environment...
    cd Wingman-backend
    %PYTHON_CMD% -m venv .venv
    cd ..
) else (
    echo Virtual environment already exists.
)

:: Activate and install dependencies
echo Installing Python dependencies...
call Wingman-backend\.venv\Scripts\activate

:: Set PyO3 compatibility flag for Python 3.13
set PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1

pip install -r Wingman-backend\requirements.txt

echo Python environment setup complete!

:: Install npm dependencies
echo Installing npm dependencies...
npm install

echo Setup complete!
echo To run the app in development mode: npm run dev:full