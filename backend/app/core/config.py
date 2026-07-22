from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Este arquivo está em backend/app/core/config.py.
# parents: [0]=core  [1]=app  [2]=backend  [3]=kindle-local-tool/ (raiz)
PROJECT_ROOT: Path = Path(__file__).resolve().parents[3]

STORAGE_INPUT: Path = PROJECT_ROOT / "storage" / "input"
STORAGE_OUTPUT: Path = PROJECT_ROOT / "storage" / "output"
STORAGE_TEMP: Path = PROJECT_ROOT / "storage" / "temp"
STORAGE_COVERS: Path = PROJECT_ROOT / "storage" / "covers"
STORAGE_LOGS: Path = PROJECT_ROOT / "storage" / "logs"


class Settings(BaseSettings):
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    kindle_email: str = ""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        extra="ignore",
    )


settings = Settings()
