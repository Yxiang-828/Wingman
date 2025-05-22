import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
import os
import sys
import logging
import socket

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version=settings.VERSION
)

# Configure CORS for frontend integration - ensure Electron app can access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production mode, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health check endpoint - this is vital for the frontend to detect the backend
@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {
        "status": "ok",
        "version": settings.VERSION,
        "mode": "bundled" if settings.IS_BUNDLED else "development"
    }

# Status endpoint for Electron to check
@app.get("/status")
def app_status():
    try:
        # Try to connect to Supabase
        from app.core.supabase import supabase
        logger.info("Status check with Supabase connection test")
        return {
            "status": "ok",
            "database": "connected",
            "version": settings.VERSION
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backend error: {str(e)}")

# Add startup event handler
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {'bundled' if settings.IS_BUNDLED else 'development'}")
    logger.info(f"API path: {settings.API_V1_STR}")
    logger.info(f"Server: {settings.HOST}:{settings.PORT}")

if __name__ == "__main__":
    # Start the server
    host = settings.HOST
    port = settings.PORT
    
    # Check if port is already in use
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex((host, port))
    if result == 0:
        logger.warning(f"Port {port} is already in use. Trying alternative port 8080...")
        port = 8080  # Try alternative port
    sock.close()
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=not settings.IS_BUNDLED)