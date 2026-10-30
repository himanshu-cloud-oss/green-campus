"""Application configuration settings."""
import json
import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables and defaults."""

    APP_NAME: str = "Green Campus AI - Manav Rachna University"
    APP_VERSION: str = "1.0.0"
    DEMO_MODE: bool = True
    APP_TIMEZONE: str = "Asia/Kolkata"
    DATABASE_URL: str = "sqlite:///./greencampus.db"
    
    # CORS allowed origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Energy & Simulation Defaults
    NO_SHOW_COUNTDOWN_SECONDS: int = 180
    DEFAULT_TARIFF_PER_KWH: float = 8.50
    DEFAULT_GRID_EMISSION_FACTOR: float = 0.82  # kg CO2 / kWh
    DEFAULT_CLASSROOM_LOAD_KW: float = 2.4
    DEFAULT_AC_LOAD_KW: float = 1.5
    DEFAULT_FAN_LOAD_KW: float = 0.075
    DEFAULT_LIGHTS_LOAD_KW: float = 0.2

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS_ORIGINS from string or list format."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
