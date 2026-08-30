from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.db.database import Base


class StageMetric(Base):
    __tablename__ = "stage_metrics"

    id                = Column(Integer, primary_key=True, index=True)
    job_id            = Column(Integer, index=True, nullable=False)
    stage             = Column(String, nullable=False)        # upload|analyze|convert|comic_convert|translate|comic_translate|send|export
    status            = Column(String, nullable=False)        # completed|failed
    started_at        = Column(DateTime, nullable=True)
    finished_at       = Column(DateTime, nullable=True)
    duration_ms       = Column(Float, nullable=True)
    processing_mode   = Column(String, nullable=True)         # document|comic
    input_format      = Column(String, nullable=True)
    translator_engine = Column(String, nullable=True)
    error_type        = Column(String, nullable=True)
    error_message     = Column(String(500), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
