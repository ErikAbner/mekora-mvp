"""
Serviço de limpeza de arquivos temporários — Fase 7.

Remove arquivos de storage/input, storage/temp e storage/output de jobs
finalizados (status "done" ou "error") há mais de *retention_days* dias.

Chamado automaticamente no startup do servidor e pode ser acionado
manualmente via POST /maintenance/cleanup.

Premissa: limpeza é best-effort — erros de remoção de arquivo individuais
são silenciados para não bloquear a inicialização.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timedelta
from pathlib import Path


def cleanup_old_jobs(retention_days: int) -> dict:
    """
    Apaga arquivos associados a jobs finalizados há mais de *retention_days* dias.

    Args:
        retention_days: Número de dias de retenção após a última atualização do job.

    Returns:
        {"deleted_jobs_files": int, "cutoff": str}
    """
    # Importações locais para evitar problemas de importação circular
    from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        jobs = (
            db.query(ProcessingJob)
            .filter(
                ProcessingJob.updated_at < cutoff,
                ProcessingJob.status.in_(["done", "error"]),
            )
            .all()
        )

        deleted = 0
        for job in jobs:
            job_id = job.id

            # Remove pasta temp/{id}/ (thumbnails, PDF com OCR)
            temp_dir = STORAGE_TEMP / str(job_id)
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

            # Remove pasta output/{id}/ (EPUB gerado)
            output_dir = STORAGE_OUTPUT / str(job_id)
            if output_dir.exists():
                shutil.rmtree(output_dir, ignore_errors=True)

            # Remove arquivo de input original
            if job.input_path:
                Path(job.input_path).unlink(missing_ok=True)

            deleted += 1

        return {"deleted_jobs_files": deleted, "cutoff": str(cutoff.date())}

    finally:
        db.close()


def apagar_arquivos_do_trabalho(job) -> None:
    """Apaga os arquivos de UM trabalho, agora, a pedido de quem é dono dele.

    A `cleanup_old_jobs` faz o mesmo por idade e para muitos. Esta faz por
    ordem, e para um só — e o corpo é o mesmo de propósito: se um dia aparecer
    uma quarta pasta por trabalho, esquecê-la aqui deixaria lixo que ninguém
    procura. Chamar a de cima com um filtro não serve: ela decide sozinha QUAIS
    trabalhos morrem, e este já foi decidido.
    """
    from app.core.config import STORAGE_OUTPUT, STORAGE_TEMP

    for pasta in (STORAGE_TEMP / str(job.id), STORAGE_OUTPUT / str(job.id)):
        if pasta.exists():
            shutil.rmtree(pasta, ignore_errors=True)

    if job.input_path:
        Path(job.input_path).unlink(missing_ok=True)
