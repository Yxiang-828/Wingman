@echo off
setlocal EnableDelayedExpansion

echo Starting Wingman Project Audit...
echo.

:: Log file in temp directory with consistent naming
set "LOGFILE=%TEMP%\wingman-audit-log.txt"
echo Wingman Audit Log > "%LOGFILE%"
echo Started: %DATE% %TIME% >> "%LOGFILE%"
echo Working Directory: "%CD%" >> "%LOGFILE%"
echo. >> "%LOGFILE%"

:: Check basic project structure
echo Checking project structure...
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo ERROR: package.json not found! >> "%LOGFILE%"
    echo Are you in the Wingman project directory?
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo ✓ package.json found
echo ✓ package.json found >> "%LOGFILE%"

if not exist "src" (
    echo ERROR: src directory not found!
    echo ERROR: src directory not found! >> "%LOGFILE%"
    pause
    exit /b 1
)
echo ✓ src directory found
echo ✓ src directory found >> "%LOGFILE%"

:: Check project folders
echo.
echo Checking project folders...
if exist "Wingman-backend" (
    echo ✓ Backend directory found
    echo ✓ Backend directory found >> "%LOGFILE%"
) else (
    echo ✗ Backend directory missing
    echo ✗ Backend directory missing >> "%LOGFILE%"
)

if exist "electron" (
    echo ✓ Electron directory found
    echo ✓ Electron directory found >> "%LOGFILE%"
) else (
    echo ✗ Electron directory missing
    echo ✗ Electron directory missing >> "%LOGFILE%"
)

:: Check npm - Windows specific approach
echo.
echo Checking npm...
echo Checking npm... >> "%LOGFILE%"

:: Clean up any existing temp file
if exist "temp_npm_check.txt" del /f /q "temp_npm_check.txt"

:: Test npm with timeout protection
echo Testing npm command...
start /wait /b cmd /c "npm --version > temp_npm_check.txt 2>&1 & echo NPM_EXIT_CODE:!ERRORLEVEL! >> temp_npm_check.txt"

:: Wait a moment for file to be written
timeout /t 2 /nobreak >nul 2>&1

if not exist "temp_npm_check.txt" (
    echo ERROR: npm test failed - no output file created!
    echo ERROR: npm test failed - no output file created! >> "%LOGFILE%"
    echo This might indicate npm is not installed or PATH issues
    pause
    exit /b 1
)

:: Check the content
set "NPM_WORKS=0"
for /f "tokens=*" %%a in (temp_npm_check.txt) do (
    echo npm output: %%a
    echo npm output: %%a >> "%LOGFILE%"
    echo %%a | findstr /r "^[0-9]" >nul
    if !ERRORLEVEL! equ 0 (
        set "NPM_WORKS=1"
        set "NPM_VERSION=%%a"
    )
    echo %%a | findstr "NPM_EXIT_CODE:0" >nul
    if !ERRORLEVEL! equ 0 set "NPM_WORKS=1"
)

if !NPM_WORKS! equ 0 (
    echo ERROR: npm not working properly!
    echo ERROR: npm not working properly! >> "%LOGFILE%"
    echo Please check that Node.js is installed and npm is in your PATH
    echo Full npm test output:
    type temp_npm_check.txt
    del /f /q "temp_npm_check.txt" 2>nul
    pause
    exit /b 1
)

echo ✓ npm is available
echo ✓ npm is available >> "%LOGFILE%"
del /f /q "temp_npm_check.txt" 2>nul

:: Install dependencies with proper error handling
echo.
echo Installing ESLint dependencies...
echo This may take a moment...
echo Installing ESLint dependencies... >> "%LOGFILE%"

call npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh globals
set "INSTALL_RESULT=!ERRORLEVEL!"

if !INSTALL_RESULT! neq 0 (
    echo ERROR: Dependency installation failed!
    echo ERROR: Dependency installation failed! >> "%LOGFILE%"
    echo Exit code: !INSTALL_RESULT!
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo ✓ Dependencies installed >> "%LOGFILE%"

:: Run ESLint with proper error handling
echo.
echo Running ESLint check...
echo Running ESLint check... >> "%LOGFILE%"

call npm run lint
set "LINT_RESULT=!ERRORLEVEL!"

if !LINT_RESULT! neq 0 (
    echo ✗ ESLint found issues
    echo ✗ ESLint found issues >> "%LOGFILE%"
    
    echo Attempting auto-fix...
    call npm run lint:fix
    set "LINT_FIX_RESULT=!ERRORLEVEL!"
    
    if !LINT_FIX_RESULT! equ 0 (
        echo ✓ Auto-fix completed
        echo ✓ Auto-fix completed >> "%LOGFILE%"
        
        echo Re-checking...
        call npm run lint
        set "LINT_RESULT=!ERRORLEVEL!"
        
        if !LINT_RESULT! equ 0 (
            echo ✓ All ESLint issues fixed!
            echo ✓ All ESLint issues fixed! >> "%LOGFILE%"
        ) else (
            echo ✗ Some ESLint issues remain
            echo ✗ Some ESLint issues remain >> "%LOGFILE%"
        )
    ) else (
        echo ✗ Auto-fix failed
        echo ✗ Auto-fix failed >> "%LOGFILE%"
    )
) else (
    echo ✓ ESLint passed
    echo ✓ ESLint passed >> "%LOGFILE%"
)

:: Run TypeScript check
echo.
echo Checking TypeScript...
echo Checking TypeScript... >> "%LOGFILE%"

call npm run type-check
set "TYPE_RESULT=!ERRORLEVEL!"

if !TYPE_RESULT! equ 0 (
    echo ✓ TypeScript check passed
    echo ✓ TypeScript check passed >> "%LOGFILE%"
) else (
    echo ✗ TypeScript errors found
    echo ✗ TypeScript errors found >> "%LOGFILE%"
)

:: Check Python backend with Windows path handling
echo.
echo Checking Python backend...
echo Checking Python backend... >> "%LOGFILE%"

if exist "Wingman-backend\requirements.txt" (
    echo ✓ Backend requirements.txt found
    echo ✓ Backend requirements.txt found >> "%LOGFILE%"
    
    if exist "Wingman-backend\.venv" (
        echo ✓ Python virtual environment found
        echo ✓ Python virtual environment found >> "%LOGFILE%"
        
        if exist "Wingman-backend\main.py" (
            pushd "Wingman-backend"
            
            :: Check for Python executable in multiple possible locations
            set "PYTHON_EXE="
            if exist ".venv\Scripts\python.exe" (
                set "PYTHON_EXE=.venv\Scripts\python.exe"
            ) else if exist ".venv\Scripts\python3.exe" (
                set "PYTHON_EXE=.venv\Scripts\python3.exe"
            ) else if exist ".venv\bin\python" (
                set "PYTHON_EXE=.venv\bin\python"
            ) else if exist ".venv\bin\python3" (
                set "PYTHON_EXE=.venv\bin\python3"
            )
            
            if defined PYTHON_EXE (
                "!PYTHON_EXE!" -m py_compile main.py >nul 2>&1
                set "PY_COMPILE_RESULT=!ERRORLEVEL!"
                
                if !PY_COMPILE_RESULT! equ 0 (
                    echo ✓ Python backend syntax OK
                    echo ✓ Python backend syntax OK >> "..\%LOGFILE%"
                    set "PY_RESULT=0"
                ) else (
                    echo ✗ Python backend syntax errors
                    echo ✗ Python backend syntax errors >> "..\%LOGFILE%"
                    set "PY_RESULT=1"
                )
            ) else (
                echo ✗ Python executable not found in venv
                echo ✗ Python executable not found in venv >> "..\%LOGFILE%"
                echo Checked: .venv\Scripts\python.exe, .venv\Scripts\python3.exe
                echo Checked: .venv\bin\python, .venv\bin\python3
                set "PY_RESULT=1"
            )
            popd
        ) else (
            echo ✗ main.py not found
            echo ✗ main.py not found >> "%LOGFILE%"
            set "PY_RESULT=1"
        )
    ) else (
        echo ✗ Virtual environment not found
        echo ✗ Virtual environment not found >> "%LOGFILE%"
        set "PY_RESULT=1"
    )
) else (
    echo ✗ Backend requirements.txt not found
    echo ✗ Backend requirements.txt not found >> "%LOGFILE%"
    set "PY_RESULT=1"
)

:: Check build files
echo.
echo Checking build configuration...
echo Checking build configuration... >> "%LOGFILE%"

if exist "vite.config.ts" (
    echo ✓ Vite config found
    echo ✓ Vite config found >> "%LOGFILE%"
) else if exist "vite.config.js" (
    echo ✓ Vite config found (JS^)
    echo ✓ Vite config found (JS^) >> "%LOGFILE%"
) else (
    echo ✗ Vite config missing
    echo ✗ Vite config missing >> "%LOGFILE%"
)

if exist "electron\main.js" (
    echo ✓ Electron main process found
    echo ✓ Electron main process found >> "%LOGFILE%"
) else (
    echo ✗ Electron main process missing
    echo ✗ Electron main process missing >> "%LOGFILE%"
)

if exist "electron\preload.js" (
    echo ✓ Electron preload script found
    echo ✓ Electron preload script found >> "%LOGFILE%"
) else (
    echo ✗ Electron preload script missing
    echo ✗ Electron preload script missing >> "%LOGFILE%"
)

:: Final results
echo.
echo ==========================================
echo              FINAL RESULTS
echo ==========================================
echo ==========================================>> "%LOGFILE%"
echo              FINAL RESULTS>> "%LOGFILE%"
echo ==========================================>> "%LOGFILE%"

set "OVERALL_STATUS=0"

if !LINT_RESULT! equ 0 (
    echo ESLint: PASSED
    echo ESLint: PASSED >> "%LOGFILE%"
) else (
    echo ESLint: FAILED
    echo ESLint: FAILED >> "%LOGFILE%"
    set "OVERALL_STATUS=1"
)

if !TYPE_RESULT! equ 0 (
    echo TypeScript: PASSED
    echo TypeScript: PASSED >> "%LOGFILE%"
) else (
    echo TypeScript: FAILED
    echo TypeScript: FAILED >> "%LOGFILE%"
    set "OVERALL_STATUS=1"
)

if !PY_RESULT! equ 0 (
    echo Python Backend: PASSED
    echo Python Backend: PASSED >> "%LOGFILE%"
) else (
    echo Python Backend: FAILED
    echo Python Backend: FAILED >> "%LOGFILE%"
    set "OVERALL_STATUS=1"
)

echo.
if !OVERALL_STATUS! equ 0 (
    echo 🎉 ALL CHECKS PASSED! Project is ready for build.
    echo 🎉 ALL CHECKS PASSED! Project is ready for build. >> "%LOGFILE%"
    echo.
    echo Next steps:
    echo   1. Run 'npm run build' to create production build
    echo   2. Run 'npm run electron:build:win' to package for Windows
    echo   3. Check dist/ and dist_electron/ folders for outputs
) else (
    echo ⚠️ Issues found. Fix the errors above before building.
    echo ⚠️ Issues found. Fix the errors above before building. >> "%LOGFILE%"
    echo.
    echo Recommended fixes:
    echo   1. Review error messages above
    echo   2. Fix TypeScript/ESLint errors manually
    echo   3. Run audit again to verify fixes
)

echo.
echo Audit completed: %TIME%
echo Audit completed: %TIME% >> "%LOGFILE%"
echo Full log saved to: %LOGFILE%

echo.
echo Copying results to clipboard...
type "%LOGFILE%" | clip 2>nul
if !ERRORLEVEL! equ 0 (
    echo ✓ Results copied to clipboard!
) else (
    echo Results saved to %LOGFILE%
)

echo.
echo Opening log file...
start "" "%LOGFILE%"

echo.
echo Press any key to exit...
pause >nul
exit /b !OVERALL_STATUS!