@echo off
echo Starting Wingman backend...

cd Wingman-backend
call .venv\Scripts\activate
uvicorn main:app --reload --port 8080

echo Backend stopped.

// In src/App.tsx
const checkBackend = async () => {
  try {
    const response = await fetch("http://localhost:8080/");
    if (response.ok) {
      setBackendReady(true);
    }
  } catch (error) {
    console.error("Backend not ready:", error);
    setBackendReady(false);
  }
};