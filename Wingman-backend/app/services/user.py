from app.core.supabase import supabase
from app.api.v1.schemas.user import UserCreate

def create_user(user: UserCreate):
    try:
        # Set default username from email if not provided
        user_data = user.dict()
        if 'username' not in user_data or not user_data['username']:
            user_data['username'] = user_data['email'].split('@')[0]
        
        # Explicitly generate UUID if not present
        if 'id' not in user_data:
            import uuid
            user_data['id'] = str(uuid.uuid4())
        
        print(f"Creating user with data: {user_data}")
        
        # Insert user into the database
        response = supabase.table("users").insert(user_data).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        
        # Handle error case
        print("Error: No data returned from user creation")
        print(f"Response: {response}")
        return None
    except Exception as e:
        print(f"Error creating user: {e}")
        raise

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

def verify_user_exists(user_id: str) -> bool:
    """Check if a user exists in the database"""
    try:
        response = supabase.table("users").select("id").eq("id", user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error verifying user: {e}")
        return False