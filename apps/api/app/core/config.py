from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    app_name: str = "Jingling API"
    model_provider: Literal["demo", "cloud", "local"] = "demo"
    model_base_url: str = ""
    model_api_key: str = ""
    model_name: str = ""
    jingling_db_path: str = "data/jingling.db"
    request_timeout_seconds: float = Field(default=30.0, gt=0, le=180)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def database_path() -> Path:
    raw = Path(get_settings().jingling_db_path)
    path = raw if raw.is_absolute() else Path(__file__).resolve().parents[4] / raw
    path.parent.mkdir(parents=True, exist_ok=True)
    return path
