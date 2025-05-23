REM filepath: c:\Users\xiang\testee\fix-dependencies.bat
@echo off
echo Fixing Supabase dependencies...

cd Wingman-backend
call .venv\Scripts\activate

echo Uninstalling problematic packages...
pip uninstall -y supabase gotrue-py postgrest-py

echo Installing compatible version...
pip install supabase==1.0.3

echo Dependencies fixed!
echo You can now run your backend with: uvicorn main:app --reload --port 8080