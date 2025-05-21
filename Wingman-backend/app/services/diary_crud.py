from datetime import date
from app.core.supabase import supabase
from app.api.v1.schemas.diary import DiaryCreate, DiaryUpdate

def get_entries_by_date(date_value):
    # Accepts string or date
    if isinstance(date_value, date):
        date_value = date_value.isoformat()
    response = supabase.table("diary_entries").select("*").eq("entry_date", date_value).execute()
    return response.data

def create_entry(entry: DiaryCreate):
    data = dict(entry)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    response = supabase.table("diary_entries").insert(data).execute()
    return response.data[0] if response.data else None

def update_entry(entry_id: int, entry: DiaryUpdate):
    data = dict(entry)
    if "date" in data and isinstance(data["date"], date):
        data["date"] = data["date"].isoformat()
    response = supabase.table("diary_entries").update(data).eq("id", entry_id).execute()
    return response.data[0] if response.data else None

def delete_entry(entry_id: int):
    response = supabase.table("diary_entries").delete().eq("id", entry_id).execute()
    return response.data[0] if response.data else None