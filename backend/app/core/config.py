from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Inventory Demand Forecasting Agent"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/inventory_db"
    REDIS_URL: str = "redis://localhost:6379"

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemma-3-1b-it"
    LLM_TEMPERATURE: float = 0.1

    # Forecasting
    FORECAST_HORIZON_DAYS: int = 30
    SAFETY_STOCK_MULTIPLIER: float = 1.5
    LEAD_TIME_DAYS: int = 7

    # Cache TTL (seconds)
    FORECAST_CACHE_TTL: int = 3600

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)

    class Config:
        env_file = ".env"
        extra = "ignore"   # ignore unknown env vars like NODE_ENV, etc.


@lru_cache
def get_settings() -> Settings:
    return Settings()
