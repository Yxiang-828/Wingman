from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import calendar, task, user, diary, chat  # Added chat
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

# Include routers for different endpoints
app.include_router(calendar.router, prefix="/api/v1", tags=["calendar"])
app.include_router(task.router, prefix="/api/v1", tags=["tasks"])
app.include_router(user.router, prefix="/api/v1", tags=["users"])
app.include_router(diary.router, prefix="/api/v1", tags=["diary"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])  # Added chat router

@app.get("/")
def read_root():
    return {"message": "Welcome to Wingman API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

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