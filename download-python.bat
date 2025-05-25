@echo off
echo Downloading portable Python distribution...

set PYTHON_VERSION=3.13.0
set DOWNLOAD_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip
set DOWNLOAD_PATH=python-portable.zip
set EXTRACT_PATH=python-dist

echo Downloading Python %PYTHON_VERSION% from %DOWNLOAD_URL%
curl -L %DOWNLOAD_URL% -o %DOWNLOAD_PATH%

echo Extracting Python...
if exist %EXTRACT_PATH% rmdir /s /q %EXTRACT_PATH%
mkdir %EXTRACT_PATH%
tar -xf %DOWNLOAD_PATH% -C %EXTRACT_PATH%

echo Creating pth file to allow imports...
echo import site > %EXTRACT_PATH%\python313._pth
echo . >> %EXTRACT_PATH%\python313._pth
echo Lib\site-packages >> %EXTRACT_PATH%\python313._pth

echo Installing pip...
curl -L https://bootstrap.pypa.io/get-pip.py -o %EXTRACT_PATH%\get-pip.py
%EXTRACT_PATH%\python.exe %EXTRACT_PATH%\get-pip.py

echo Installing dependencies...
%EXTRACT_PATH%\python.exe -m pip install fastapi uvicorn supabase==1.0.3 pydantic==2.11.4 pydantic-settings==2.9.1 python-dotenv==1.1.0 annotated-types==0.7.0 typing-inspection==0.4.0 typing_extensions==4.13.2 httpx==0.23.3 python-dateutil==2.9.0 loguru==0.7.2

echo Cleaning up...
del %DOWNLOAD_PATH%
del %EXTRACT_PATH%\get-pip.py

echo Portable Python setup complete!