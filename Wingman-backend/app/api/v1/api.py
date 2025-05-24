from fastapi import APIRouter
from app.api.v1.endpoints import user, task, calendar  # Add other endpoint modules as needed

api_router = APIRouter()
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(task.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
# Add more routers as needed