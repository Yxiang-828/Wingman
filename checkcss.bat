@echo off
echo Checking CSS imports...

echo.
echo === Main CSS Files ===
if exist "src\main.css" (echo ✅ main.css found) else (echo ❌ main.css missing)
if exist "src\index.css" (echo ✅ index.css found) else (echo ❌ index.css missing)

echo.
echo === Component CSS Files ===
if exist "src\components\Common\ErrorDisplay.css" (echo ✅ ErrorDisplay.css found) else (echo ❌ ErrorDisplay.css missing)
if exist "src\components\Sidebar\Sidebar.css" (echo ✅ Sidebar.css found) else (echo ❌ Sidebar.css missing)
if exist "src\components\Calendar\Calendar.css" (echo ✅ Calendar.css found) else (echo ❌ Calendar.css missing)
if exist "src\components\Dashboard\Dashboard.css" (echo ✅ Dashboard.css found) else (echo ❌ Dashboard.css missing)

echo.
echo === Build Clean ===
rmdir /s /q "node_modules\.cache" 2>nul
rmdir /s /q "dist" 2>nul
echo Cache cleared

echo.