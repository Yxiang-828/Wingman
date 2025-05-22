@echo off
echo Starting Wingman backend...

cd Wingman-backend
call .venv\Scripts\activate
uvicorn main:app --reload --port 8080

echo Backend stopped.