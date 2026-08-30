from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import (
    PROJECT_ROOT,
    STORAGE_COVERS,
    STORAGE_INPUT,
    STORAGE_LOGS,
    STORAGE_OUTPUT,
    STORAGE_TEMP,
)

DATABASE_URL = f"sqlite:///{PROJECT_ROOT}/storage/kindle_tool.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Cria diretórios de storage e inicializa as tabelas do banco."""
    for directory in (STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP, STORAGE_COVERS, STORAGE_LOGS):
        directory.mkdir(parents=True, exist_ok=True)

    # Importa modelos para registrá-los no metadata do SQLAlchemy
    from app.models.processing_job import ProcessingJob  # noqa: F401
    from app.models.stage_metric import StageMetric  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Migração inline: adiciona colunas novas sem Alembic (SQLite suporta ADD COLUMN)
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE processing_jobs ADD COLUMN send_error TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN input_format TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN processing_mode TEXT DEFAULT 'document'",
            "ALTER TABLE processing_jobs ADD COLUMN translation_enabled INTEGER DEFAULT 0",
            "ALTER TABLE processing_jobs ADD COLUMN source_language TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN target_language TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN translation_status TEXT DEFAULT 'not_started'",
            "ALTER TABLE processing_jobs ADD COLUMN translation_error TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN translator_engine TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_mode INTEGER DEFAULT 0",
            "ALTER TABLE processing_jobs ADD COLUMN manga_rtl INTEGER DEFAULT 0",
            "ALTER TABLE processing_jobs ADD COLUMN translated_artifact_path TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN translated_artifact_format TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_translation_enabled INTEGER DEFAULT 0",
            "ALTER TABLE processing_jobs ADD COLUMN comic_translation_status TEXT DEFAULT 'not_started'",
            "ALTER TABLE processing_jobs ADD COLUMN comic_translation_error TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_translation_artifact_path TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_translation_artifact_format TEXT",
            # Estabilização v1 — export final comic + modo de fluxo + operação ativa
            "ALTER TABLE processing_jobs ADD COLUMN comic_export_status TEXT DEFAULT 'not_started'",
            "ALTER TABLE processing_jobs ADD COLUMN comic_export_path TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_export_source TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN comic_export_error TEXT",
            "ALTER TABLE processing_jobs ADD COLUMN flow_mode TEXT DEFAULT 'advanced'",
            "ALTER TABLE processing_jobs ADD COLUMN active_operation TEXT",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Coluna já existe — ignorar
