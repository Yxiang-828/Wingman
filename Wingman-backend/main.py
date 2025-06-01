from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import user  # REMOVED: calendar, task, diary, chat (now handled by SQLite)
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

# ✅ HYBRID ARCHITECTURE: Only include authentication/user management routes
# Data operations (tasks, calendar, diary, chat) now go directly to SQLite via Electron IPC
app.include_router(user.router, prefix="/api/v1", tags=["users"])

@app.get("/")
def read_root():
    return {
        "message": "Wingman API - Hybrid Mode", 
        "architecture": "Auth: Supabase | Data: Local SQLite",
        "data_endpoints": "Removed - handled by LocalDataManager"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mode": "hybrid",
        "services": {
            "authentication": "supabase",
            "data_storage": "local_sqlite"
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

# ✅ DATA ENDPOINT STATUS (for debugging)
@app.get("/api/v1/status")
def data_endpoint_status():
    return {
        "removed_endpoints": [
            "/api/v1/tasks/*",
            "/api/v1/calendar/*", 
            "/api/v1/diary/*",
            "/api/v1/chat/*"
        ],
        "reason": "Data operations now handled by LocalDataManager via Electron IPC",
        "active_endpoints": [
            "/api/v1/users/*"
        ],
        "migration_status": "complete"
    }