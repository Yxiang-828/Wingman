@echo off
echo ===== WINGMAN PORTABLE PYTHON VERIFICATION =====
echo This script tests if the packaged app can start the backend properly
echo.

if not exist "dist\win-unpacked\Wingman.exe" (
  echo ERROR: Packaged app not found!
  echo Please run complete-build.bat first
  pause
  exit /b 1
)

echo Testing portable Python in packaged app...
if exist "dist\win-unpacked\resources\python-dist\python.exe" (
  echo ✓ Portable Python found in packaged app
  echo Testing Python execution...
  "dist\win-unpacked\resources\python-dist\python.exe" --version
  if %errorlevel% equ 0 (
    echo ✓ Portable Python executes correctly
  ) else (
    echo ERROR: Portable Python failed to execute
    pause
    exit /b 1
  )
  
  echo Testing core dependencies...
  "dist\win-unpacked\resources\python-dist\python.exe" -c "import fastapi, uvicorn; print('Core dependencies OK')"
  if %errorlevel% equ 0 (
    echo ✓ Core dependencies available
  ) else (
    echo ERROR: Core dependencies missing
    pause
    exit /b 1
  )
  
  echo Testing backend files...
  if exist "dist\win-unpacked\resources\Wingman-backend\main.py" (
    echo ✓ Backend files found
  ) else (
    echo ERROR: Backend files missing
    pause
    exit /b 1
  )
  
  echo.
  echo ===== VERIFICATION COMPLETE =====
  echo ✅ Packaged app should work on machines without Python
  echo ✅ All required files are bundled
  echo ✅ Python interpreter and dependencies are working
  echo.
  echo You can now test the app by running: dist\win-unpacked\Wingman.exe
  echo Or use debug-wingman.bat for detailed logging
  
) else (
  echo ERROR: Portable Python NOT found in packaged app!
  echo Expected location: dist\win-unpacked\resources\python-dist\python.exe
  echo Please check if the build process completed successfully
  pause
  exit /b 1
)

pause
