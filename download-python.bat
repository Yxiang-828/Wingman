@echo off
echo Downloading portable Python distribution...

set PYTHON_VERSION=3.13.1
set DOWNLOAD_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip
set DOWNLOAD_PATH=python-portable.zip
set EXTRACT_PATH=python-dist

echo Downloading Python %PYTHON_VERSION% from %DOWNLOAD_URL%
curl -L %DOWNLOAD_URL% -o %DOWNLOAD_PATH%

echo Extracting Python...
if exist %EXTRACT_PATH% rmdir /s /q %EXTRACT_PATH%
mkdir %EXTRACT_PATH%
tar -xf %DOWNLOAD_PATH% -C %EXTRACT_PATH%

echo Configuring Python path file...
(
echo python313.zip
echo .
echo import site
) > %EXTRACT_PATH%\python313._pth

echo Installing pip...
curl -L https://bootstrap.pypa.io/get-pip.py -o %EXTRACT_PATH%\get-pip.py

echo Testing Python before pip installation...
%EXTRACT_PATH%\python.exe -c "import sys; print('Python working:', sys.version)"
if %errorlevel% neq 0 (
    echo ERROR: Python is not working correctly
    pause
    exit /b 1
)

echo Installing pip...
%EXTRACT_PATH%\python.exe %EXTRACT_PATH%\get-pip.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to install pip
    pause
    exit /b 1
)

echo Installing dependencies...
%EXTRACT_PATH%\python.exe -m pip install fastapi==0.110.0 uvicorn==0.29.0 supabase==2.15.0 pydantic==2.11.4 pydantic-settings==2.9.1 pydantic_core==2.33.2 python-dotenv==1.1.0 annotated-types==0.7.0 typing-inspection==0.4.0 typing_extensions==4.13.2 httpx==0.27.0 python-dateutil==2.9.0 loguru==0.7.2 ollama==0.5.1 psutil==5.9.8
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo Cleaning up...
del %DOWNLOAD_PATH%
del %EXTRACT_PATH%\get-pip.py

echo Portable Python setup complete!