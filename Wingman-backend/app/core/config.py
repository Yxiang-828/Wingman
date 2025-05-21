from pydantic import BaseSettings, Field
import os
import json
import sys
from pathlib import Path

# Detect if we're running in a bundled Electron app
def is_bundled():
    # Check if we are bundled within Electron
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return True
    
    # Check for resources path in Electron
    if 'ELECTRON_RUN_AS_NODE' in os.environ:
        return True
    
    return False

# Get paths for configuration
def get_config_paths():
    if is_bundled():
        # If bundled, use the resources directory
        if sys.platform == 'win32':
            base_path = Path(os.environ.get('LOCALAPPDATA')) / 'Wingman'
        elif sys.platform == 'darwin':
            base_path = Path.home() / 'Library' / 'Application Support' / 'Wingman'
        else:
            base_path = Path.home() / '.wingman'
            
        # Create the directory if it doesn't exist
        os.makedirs(base_path, exist_ok=True)
        
        # Config file in user data directory
        config_file = base_path / 'config.json'
        env_file = base_path / '.env'
        
    else:
        # If running in development
        base_path = Path(__file__).resolve().parent.parent.parent
        config_file = base_path / '.venv' / 'config.json'
        env_file = base_path / '.env'
    
    return base_path, config_file, env_file

# Try to load config from file
def load_config():
    _, config_file, _ = get_config_paths()
    
    try:
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
    
    return {}

# Load configuration
app_config = load_config()

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wingman API"
    
    # Detect if we're running as a bundled app
    IS_BUNDLED: bool = is_bundled()
    
    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Supabase settings - try app_config first, then env vars, then .env file
    SUPABASE_URL: str = app_config.get('SUPABASE_URL') or Field(..., env="SUPABASE_URL")
    SUPABASE_KEY: str = app_config.get('SUPABASE_KEY') or Field(..., env="SUPABASE_KEY")

    # App version
    VERSION: str = app_config.get('APP_VERSION', '1.0.0')

    class Config:  # Already using the correct style for v1.10.x
        env_file = get_config_paths()[2]
        case_sensitive = True

settings = Settings()