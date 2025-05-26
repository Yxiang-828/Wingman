@echo off
echo [🔍] Checking file: %1

echo [1/2] ESLint check (unused vars, imports, etc.)
call npx eslint --config .eslintrc.cjs "%1" --quiet

if %errorlevel%==0 (
    echo [✅] ESLint check passed.
) else (
    echo [❌] ESLint check found issues.
)

echo.
echo [2/2] TypeScript type check
call npx tsc "%1" --noEmit --skipLibCheck --isolatedModules

if %errorlevel%==0 (
    echo [✅] Type check passed.
) else (
    echo [❌] Type check failed.
)

echo.
echo [✓] File check complete.