@echo off
REM Setup script for Wingman sentence transformer integration

echo Installing required dependencies...
cd Wingman-backend
pip install -r requirements.txt

echo Running sentence transformer tests...
python -m tests.test_sentence_transformers

echo.
echo Installation and testing complete.
echo For more information, see the documentation:
echo - docs\SENTENCE-TRANSFORMERS-GUIDE.md
echo - docs\CHAT-ENHANCEMENTS-SUMMARY.md
echo - docs\LIMITATIONS-AND-TRAINING.md
echo.
