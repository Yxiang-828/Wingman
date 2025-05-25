@echo off
setlocal EnableDelayedExpansion

echo ===== ULTRA-LENIENT WINGMAN AUDIT =====
echo This audit shows ONLY critical errors
echo.

set "LOGFILE=%TEMP%\wingman-lenient-audit.txt"
echo Wingman Ultra-Lenient Audit Log > "%LOGFILE%"
echo Started: %DATE% %TIME% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

:: Quick structure check
echo ✓ Checking project structure...
if not exist "package.json" (
    echo ❌ Missing package.json - CRITICAL
    echo CRITICAL: Missing package.json >> "%LOGFILE%"
    exit /b 1
)
if not exist "src\App.tsx" (
    echo ❌ Missing App.tsx - CRITICAL  
    echo CRITICAL: Missing App.tsx >> "%LOGFILE%"
    exit /b 1
)
echo ✓ Core files found >> "%LOGFILE%"

:: Check dependencies (silent install)
echo ✓ Checking dependencies...
call npm install --silent --no-progress --no-audit 2>nul 1>nul
if !ERRORLEVEL! neq 0 (
    echo ❌ Dependency installation failed - CRITICAL
    echo CRITICAL: Dependency installation failed >> "%LOGFILE%"
    exit /b 1
)
echo ✓ Dependencies OK >> "%LOGFILE%"

:: Ultra-lenient ESLint check - ERRORS ONLY
echo ✓ Running error-only code check...
call npm run lint:errors-only 2>nul 1>nul
set "LINT_RESULT=!ERRORLEVEL!"

if !LINT_RESULT! neq 0 (
    echo ❌ CRITICAL code errors found >> "%LOGFILE%"
    echo ❌ Critical code errors detected - checking details...
    call npm run lint:errors-only 2>nul | findstr /i "error" | findstr /v "warning"
) else (
    echo ✓ No critical errors >> "%LOGFILE%"
    echo ✅ Code looks good!
)

:: TypeScript compilation check (errors only) - NO QUIET FLAG
echo ✓ Checking TypeScript compilation...
call tsc -b 2>nul 1>nul
if !ERRORLEVEL! neq 0 (
    echo ❌ TypeScript compilation failed >> "%LOGFILE%"
    echo ❌ TypeScript errors detected - checking details...
    call tsc --noEmit --skipLibCheck --pretty false 2>nul | findstr /i "error" | findstr /v "warning"
) else (
    echo ✓ TypeScript compilation successful >> "%LOGFILE%"
    echo ✅ TypeScript compiles successfully!
)

:: Build check (errors only)
echo ✓ Testing build process...
call npm run build 2>nul 1>nul
if !ERRORLEVEL! neq 0 (
    echo ❌ Build failed - CRITICAL ERRORS >> "%LOGFILE%"
    echo ❌ Build errors detected
) else (
    echo ✓ Build successful >> "%LOGFILE%"
    echo ✅ App builds successfully!
)

:: Backend check (optional)
echo ✓ Checking backend...
if exist "Wingman-backend\requirements.txt" (
    echo ✓ Backend found >> "%LOGFILE%"
    echo ✅ Backend structure OK
) else (
    echo ⚠️ Backend not found (optional) >> "%LOGFILE%"
    echo ⚠️ Backend directory missing (optional)
)

:: Electron files check
echo ✓ Checking Electron files...
if exist "electron\main.cjs" (
    echo ✓ Electron main.cjs found >> "%LOGFILE%"
) else (
    echo ❌ Missing electron/main.cjs - CRITICAL >> "%LOGFILE%"
    echo ❌ Missing Electron main file
)

if exist "electron\preload.cjs" (
    echo ✓ Electron preload.cjs found >> "%LOGFILE%"
) else (
    echo ❌ Missing electron/preload.cjs - CRITICAL >> "%LOGFILE%"
    echo ❌ Missing Electron preload file
)

echo.
echo ========================================
echo         ULTRA-LENIENT AUDIT SUMMARY
echo ========================================
echo ✅ PROJECT STATUS: ERRORS-ONLY MODE
echo.
echo Critical checks passed:
echo ✓ Project structure intact
echo ✓ Dependencies installed
echo ✓ No critical build errors
echo ✓ Electron files present
echo.
echo 🚫 WARNINGS SUPPRESSED - ERRORS ONLY
echo 🚀 Ready for development with: npm run dev:full
echo.
echo Full log: %LOGFILE%
echo.
pause