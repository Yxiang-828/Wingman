from app.services.diary_crud import get_entries_by_date, create_entry, update_entry, delete_entry

def get_diary_entries(user_id: str):
    """Get all diary entries for a user"""
    # This function bridges the endpoint call to the actual implementation
    return get_entries_by_date(user_id)

def get_diary_entry(entry_id: int, user_id: str):
    """Get a specific diary entry"""
    # Call get_entries_by_date with an entry_id filter
    entries = get_entries_by_date(user_id, entry_id=entry_id)
    return entries[0] if entries else None

def create_diary_entry(entry_data: dict):
    """Create a new diary entry"""
    return create_entry(entry_data)

def update_diary_entry(entry_id: int, entry_data: dict):
    """Update a diary entry"""
    return update_entry(entry_id, entry_data)

def delete_diary_entry(entry_id: int):
    """Delete a diary entry"""
    return delete_entry(entry_id)