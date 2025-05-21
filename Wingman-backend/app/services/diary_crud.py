from datetime import date
from app.core.supabase import supabase
from app.api.v1.schemas.diary import DiaryCreate, DiaryUpdate

def get_entries_by_date(date_value):
    # Accepts string or date
    if isinstance(date_value, date):
        date_value = date_value.isoformat()
    
    # Use entry_date to match database column name
    response = supabase.table("diary_entries").select("*").eq("entry_date", date_value).execute()
    
    # Transform response to add 'date' field for frontend
    result = []
    for entry in response.data:
        entry_copy = dict(entry)
        # Add date field for frontend
        entry_copy["date"] = entry_copy["entry_date"]
        result.append(entry_copy)
    
    return result

def create_entry(entry: DiaryCreate):
    data = dict(entry)
    
    # Frontend sends 'date' but DB needs 'entry_date'
    if "date" in data:
        data["entry_date"] = data["date"]
        del data["date"]
        
    if isinstance(data.get("entry_date"), date):
        data["entry_date"] = data["entry_date"].isoformat()
        
    response = supabase.table("diary_entries").insert(data).execute()
    
    if response.data and len(response.data) > 0:
        entry_data = response.data[0]
        # Add date field for frontend consistency
        entry_data["date"] = entry_data["entry_date"]
        return entry_data
    return None

def update_entry(entry_id: int, entry: DiaryUpdate):
    data = dict(entry)
    
    # Map between frontend and DB field names
    if "date" in data:
        data["entry_date"] = data["date"]
        del data["date"]
        
    if isinstance(data.get("entry_date"), date):
        data["entry_date"] = data["entry_date"].isoformat()
        
    response = supabase.table("diary_entries").update(data).eq("id", entry_id).execute()
    
    if response.data and len(response.data) > 0:
        entry_data = response.data[0]
        # Add date field for frontend consistency
        entry_data["date"] = entry_data["entry_date"]
        return entry_data
    return None

def delete_entry(entry_id: int):
    response = supabase.table("diary_entries").delete().eq("id", entry_id).execute()
    if response.data and len(response.data) > 0:
        entry_data = response.data[0]
        # Add date field for frontend consistency
        entry_data["date"] = entry_data["entry_date"]
        return entry_data
    return None