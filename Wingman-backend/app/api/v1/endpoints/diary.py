from fastapi import APIRouter, Query, HTTPException
from app.services.diary_crud import get_entries_by_date, create_entry, update_entry, delete_entry
from app.api.v1.schemas.diary import DiaryCreate, DiaryUpdate
from typing import List
import traceback
from datetime import date

router = APIRouter()

@router.get("/diary/entries", response_model=List[dict])
def get_diary_entries(user_id: str = Query(...)):
    """
    Get all diary entries for a user.
    """
    try:
        return get_entries_by_date(user_id=user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching diary entries: {str(e)}")

@router.get("/diary/entries/{entry_id}", response_model=dict)
def get_diary_entry(entry_id: int, user_id: str = Query(...)):  # Query(...) means required
    """
    Get a specific diary entry by ID.
    """
    try:
        entries = get_entries_by_date(user_id=user_id, entry_id=entry_id)
        if not entries or len(entries) == 0:
            raise HTTPException(status_code=404, detail=f"Diary entry not found")
        return entries[0]
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching diary entry: {str(e)}")

@router.post("/diary/entries", response_model=dict)
def create_diary_entry(entry: dict):
    """
    Create a new diary entry.
    """
    try:
        result = create_entry(entry)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create diary entry")
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating diary entry: {str(e)}")

@router.put("/diary/entries/{entry_id}", response_model=dict)
def update_diary_entry(entry_id: int, entry: dict):
    """
    Update an existing diary entry.
    """
    try:
        result = update_entry(entry_id, entry)
        if not result:
            raise HTTPException(status_code=404, detail=f"Diary entry not found")
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating diary entry: {str(e)}")

@router.delete("/diary/entries/{entry_id}", response_model=dict)
def delete_diary_entry(entry_id: int):
    """
    Delete a diary entry.
    """
    try:
        result = delete_entry(entry_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Diary entry not found")
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting diary entry: {str(e)}")