import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
import os
import sys

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version=settings.VERSION
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production mode, this will be just the Electron app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "mode": "bundled" if settings.IS_BUNDLED else "development"
    }

# Status endpoint for Electron to check
@app.get("/status")
def app_status():
    try:
        # Try to connect to Supabase (simplified here - add actual check)
        from app.core.supabase import supabase
        return {
            "status": "ok",
            "database": "connected",
            "version": settings.VERSION
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backend error: {str(e)}")

if __name__ == "__main__":
    # Start the server
    host = settings.HOST
    port = settings.PORT
    
    # Check if port is already in use
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex((host, port))
    if result == 0:
        print(f"Port {port} is already in use. Trying alternative...")
        port = 8080  # Try alternative port
    sock.close()
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=not settings.IS_BUNDLED)