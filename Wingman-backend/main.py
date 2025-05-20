from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()  # <-- This line is required!

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.endpoints import task, calendar, chat, diary, user
app.include_router(task.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(diary.router, prefix="/api/v1")
app.include_router(user.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Welcome to Wingman API"}