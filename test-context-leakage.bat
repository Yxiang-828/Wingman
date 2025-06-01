@echo off
echo.
echo 🔒 Wingman Context Leakage Prevention Test 🔒
echo.
echo This script tests if LLM responses are properly secured against context leakage.
echo.

:: Activate virtual environment if it exists
if exist "Wingman-backend\venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call Wingman-backend\venv\Scripts\activate.bat
) else (
    echo WARNING: Virtual environment not found.
    echo You may need to create one with: python -m venv Wingman-backend\venv
    echo and install requirements: pip install -r Wingman-backend\requirements.txt
    pause
)

:: Navigate to the backend directory
cd Wingman-backend

:: Run the test script
echo.
echo Running context leakage tests...
python tests\test_context_leakage.py

:: Capture the exit code
set EXIT_CODE=%ERRORLEVEL%

:: Deactivate the virtual environment
if exist "venv\Scripts\deactivate.bat" (
    call venv\Scripts\deactivate.bat
)

:: Return to the original directory
cd ..

:: Wait for user input before closing
echo.
echo Tests completed with exit code: %EXIT_CODE%
echo.
pause
