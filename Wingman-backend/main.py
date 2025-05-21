from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import calendar, task, user, diary  # Add diary import

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for different endpoints
app.include_router(calendar.router, prefix="/api/v1", tags=["calendar"])
app.include_router(task.router, prefix="/api/v1", tags=["tasks"])
app.include_router(user.router, prefix="/api/v1", tags=["users"])
app.include_router(diary.router, prefix="/api/v1", tags=["diary"])  # Add this line

@app.get("/")
def read_root():
    return {"message": "Welcome to Wingman API"}