import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Este arquivo está em backend/app/core/config.py.
# parents: [0]=core  [1]=app  [2]=backend  [3]=kindle-local-tool/ (raiz)
PROJECT_ROOT: Path = Path(__file__).resolve().parents[3]

# ONDE OS DOCUMENTOS FICAM, e por que isto é uma variável.
#
# O caminho era derivado da posição deste arquivo, e só dela. Isso quer dizer que
# QUALQUER processo rodando com este código escrevia no mesmo lugar — inclusive
# um servidor de prova apontado para um banco descartável, que continuava
# gravando arquivos no storage de verdade.
#
# Aconteceu em 30/08: um teste com banco isolado criou `output/2` e `output/3`
# no storage real. Nada foi perdido, porque nenhum dos dois trabalhos reais
# tinha saída — mas a colisão era questão de sorte, e sorte não é isolamento.
#
# Em container, o valor vem do Dockerfile e aponta para o volume. Fora dele, o
# padrão é o de sempre: quem não configura nada não vê diferença.
STORAGE_RAIZ: Path = Path(os.getenv("MEKORA_STORAGE", PROJECT_ROOT / "storage"))

STORAGE_INPUT: Path = STORAGE_RAIZ / "input"
STORAGE_OUTPUT: Path = STORAGE_RAIZ / "output"
STORAGE_TEMP: Path = STORAGE_RAIZ / "temp"
STORAGE_COVERS: Path = STORAGE_RAIZ / "covers"
STORAGE_LOGS: Path = STORAGE_RAIZ / "logs"


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
