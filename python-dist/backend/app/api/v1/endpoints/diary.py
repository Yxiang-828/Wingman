from fastapi import APIRouter, HTTPException, Query
from app.services.diary import get_diary_entries, get_diary_entry, create_diary_entry, update_diary_entry, delete_diary_entry
from app.api.v1.schemas.diary import DiaryEntryCreate, DiaryEntryUpdate, DiaryEntryResponse
from typing import List

router = APIRouter()

@router.get("/diary", response_model=List[DiaryEntryResponse])
async def read_diary_entries(user_id: str = Query(..., description="User ID")):
    """Get all diary entries for a user"""
    entries = get_diary_entries(user_id)
    return entries

@router.get("/diary/entries/{entry_id}", response_model=DiaryEntryResponse)
async def read_diary_entry(entry_id: int, user_id: str = Query(...)):
    """Get a specific diary entry"""
    entry = get_diary_entry(entry_id, user_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return entry

@router.post("/diary/entries", response_model=DiaryEntryResponse)
async def create_entry(entry: DiaryEntryCreate):
    """Create a new diary entry"""
    return create_diary_entry(entry.dict())

@router.put("/diary/entries/{entry_id}", response_model=DiaryEntryResponse)
async def update_entry(entry_id: int, entry: DiaryEntryUpdate):
    """Update a diary entry"""
    updated_entry = update_diary_entry(entry_id, entry.dict())
    if not updated_entry:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return updated_entry

@router.delete("/diary/entries/{entry_id}")
async def delete_entry(entry_id: int):
    """Delete a diary entry"""
    success = delete_diary_entry(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return {"detail": "Diary entry deleted"}