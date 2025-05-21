from app.core.supabase import supabase
from app.api.v1.schemas.user import UserCreate

def create_user(user: UserCreate):
    # Set default username from email if not provided
    user_data = user.dict()
    if 'username' not in user_data or not user_data['username']:
        user_data['username'] = user_data['email'].split('@')[0]
    
    response = supabase.table("users").insert(user_data).execute()
    return response.data[0] if response.data else None

def get_user_by_username_and_password(username: str, password: str):
    response = supabase.table("users").select("*").eq("username", username).eq("password", password).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None

def update_user(user_id: str, name: str = None):
    update_data = {}
    if name: update_data["name"] = name
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    return response.data[0] if response.data else None