@echo off
echo ===== PACKAGING WINGMAN =====

:: 1. Ensure bundled Python is included in the package
copy python-dist\python.exe dist_electron\win-unpacked\resources\python-dist\
copy python-dist\python313.dll dist_electron\win-unpacked\resources\python-dist\
xcopy /E /Y python-dist\Lib dist_electron\win-unpacked\resources\python-dist\Lib\

:: 2. Include Visual C++ Redistributable
:: This is critical for Python to run on machines without Visual Studio
curl -L https://aka.ms/vs/17/release/vc_redist.x64.exe -o dist_electron\win-unpacked\vc_redist.x64.exe

:: 3. Create a first-run script that installs VC++ if needed
echo @echo off > dist_electron\win-unpacked\first-run.bat
echo if not exist "C:\Windows\System32\vcruntime140.dll" vc_redist.x64.exe /quiet >> dist_electron\win-unpacked\first-run.bat
echo start Wingman.exe >> dist_electron\win-unpacked\first-run.bat

echo ===== PACKAGE COMPLETE =====