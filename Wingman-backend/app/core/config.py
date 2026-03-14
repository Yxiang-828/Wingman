from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"

    # Debug settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create settings instance
settings = Settings()
