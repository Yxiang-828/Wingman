from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import user, chat  # Add chat import
from app.core.responses import CustomJSONResponse
from fastapi.responses import JSONResponse
import logging

app = FastAPI(default_response_class=CustomJSONResponse)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ HYBRID ARCHITECTURE: Include authentication + chat routes
app.include_router(user.router, prefix="/api/v1", tags=["users"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])  # Add this line

@app.get("/")
def read_root():
    return {
        "message": "Wingman API - Hybrid Mode with AI", 
        "architecture": "Auth: Supabase | Data: Local SQLite | AI: Ollama",
        "endpoints": "Auth + Chat AI enabled"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mode": "hybrid",
        "services": {
            "authentication": "supabase",
            "data_storage": "local_sqlite",
            "ai": "ollama"
        }
    }

@app.middleware("http")
async def add_global_exception_handler(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )

# ✅ DATA ENDPOINT STATUS (updated for AI)
@app.get("/api/v1/status")
def data_endpoint_status():
    return {
        "active_endpoints": [
            "/api/v1/user/*",
            "/api/v1/chat/*"  # Added
        ],
        "data_operations": "Handled by LocalDataManager via Electron IPC",
        "ai_integration": "Ollama-powered chat with context building",
        "migration_status": "complete"
    }