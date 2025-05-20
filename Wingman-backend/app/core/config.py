from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wingman API"
    
    # Supabase settings
    SUPABASE_URL: str = Field(..., env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(..., env="SUPABASE_KEY")

    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }

settings = Settings()