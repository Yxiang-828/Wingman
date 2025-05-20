from fastapi import APIRouter
from app.api.v1.schemas.diary import DiaryCreate, DiaryUpdate, DiaryInDB
from app.services.diary_crud import get_entries_by_date, create_entry, update_entry, delete_entry
from typing import List
from datetime import date

router = APIRouter()

@router.get("/diary/{date}", response_model=List[DiaryInDB])
def get_entries(date: date):
    return get_entries_by_date(date)

@router.post("/diary/", response_model=DiaryInDB)
def create_entry_endpoint(entry: DiaryCreate):
    return create_entry(entry)

@router.put("/diary/{entry_id}", response_model=DiaryInDB)
def update_entry_endpoint(entry_id: int, entry: DiaryUpdate):
    return update_entry(entry_id, entry)

@router.delete("/diary/{entry_id}", response_model=DiaryInDB)
def delete_entry_endpoint(entry_id: int):
    return delete_entry(entry_id)

@router.get("/diary/all", response_model=List[DiaryInDB])
def get_all_entries():
    # You can add user filtering if needed
    response = supabase.table("diary_entries").select("*").execute()
    return response.data or []