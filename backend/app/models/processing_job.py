from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from app.db.database import Base


class ProcessingJob(Base):
    """
    Registra cada PDF processado pela ferramenta.
    Campos seguem o PRD seção 8.7 (histórico local).
    """

    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)

    # Arquivo original e caminhos gerados
    original_filename = Column(String, nullable=False)
    input_path = Column(String)           # storage/input/
    processed_pdf_path = Column(String)   # storage/temp/ após OCR
    epub_path = Column(String)            # storage/output/
    cover_path = Column(String)           # caminho da capa selecionada
    selected_cover_page = Column(Integer) # índice 0–4 das miniaturas

    # Metadados detectados automaticamente do PDF
    detected_title = Column(String, default="")
    detected_author = Column(String, default="")
    detected_language = Column(String, default="")

    # Metadados editáveis pelo usuário (pré-preenchidos a partir dos detectados)
    final_title = Column(String, default="")
    final_author = Column(String, default="")
    final_language = Column(String, default="")
    final_filename = Column(String, default="")

    # Resultado da análise do PDF
    page_count = Column(Integer)
    is_scanned = Column(Boolean)
    avg_chars_per_page = Column(Float)

    # Status de cada etapa
    ocr_used = Column(Boolean, default=False)
    ocr_status = Column(String, default="not_needed")
    # not_needed | needed | pending | done | failed

    conversion_status = Column(String, default="not_started")  # not_started | in_progress | done | failed
    send_status = Column(String, default="not_started")  # not_started | in_progress | sent | failed
    send_error = Column(String)          # mensagem de erro do último envio (Fase 6)
    kindle_sent = Column(Boolean, default=False)

    # Status geral do processamento
    status = Column(String, default="uploaded")
    # uploaded → analyzing → analyzed → converting → converted → sending → done | error
    error_message = Column(String)

    # Multipformato (Fase 12)
    input_format = Column(String)            # extensão detectada: pdf, docx, cbz, etc.
    processing_mode = Column(String)         # document | comic

    # Tradução (Fase B)
    translation_enabled = Column(Boolean, default=False)
    source_language = Column(String)         # código 3 letras: por, eng, spa, fra, deu
    target_language = Column(String)         # código 3 letras de destino
    translation_status = Column(String, default="not_started")  # not_started | in_progress | done | failed | skipped
    translation_error = Column(String)
    translator_engine = Column(String)       # argos (Fase B) | nllb (Fase C)
    translated_artifact_path = Column(String)    # caminho do HTML traduzido
    translated_artifact_format = Column(String)  # sempre "html" quando preenchido

    # Quadrinhos (Fase A)
    comic_mode = Column(Boolean, default=False)
    manga_rtl = Column(Boolean, default=False)

    # Tradução experimental de quadrinhos (Fase D)
    comic_translation_enabled = Column(Boolean, default=False)
    comic_translation_status = Column(String, default="not_started")
    # not_started | in_progress | done | failed
    comic_translation_error = Column(String)
    comic_translation_artifact_path = Column(String)   # storage/output/{id}/comic_translation.json
    comic_translation_artifact_format = Column(String) # "json" quando preenchido

    # Export final de quadrinhos (Estabilização v1)
    comic_export_status = Column(String, default="not_started")
    # not_started | in_progress | done | failed
    comic_export_path = Column(String)      # EPUB final traduzido (comic_export/)
    comic_export_source = Column(String)    # finished_pages | final_pages
    comic_export_error = Column(String)

    # Modo de fluxo (Estabilização v1): advanced | recommended
    flow_mode = Column(String, default="advanced")

    # Operação assíncrona ativa: "{operation_type}:{operation_id}" | NULL
    active_operation = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
