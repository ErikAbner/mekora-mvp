"""
v1.2.2 — Política central de limites de processamento local.

Todos os limites usados pelos serviços de upload, extração de arquivos
compactados, execução de ferramentas externas, tradução e render vivem
aqui. Nenhum número mágico deve ser duplicado nos serviços — importar
`limits` sempre.

Valores default calibrados para livros longos (300-800pg) e mangás
comuns (150-350pg com imagens 1500×2200@RGB ≈ 10MP). Cada valor pode
ser sobrescrito por variável de ambiente. Zeros/negativos são rejeitados
no startup (`validate_limits()`).

Unidades explícitas nos nomes:
- *_MB     tamanho em megabytes (1 MB = 1024*1024 bytes)
- *_SECONDS tempo em segundos
- *_PAGES  contagem de páginas
- *_PIXELS contagem total de pixels
- *_BYTES  tamanho em bytes (para output truncado)
- *_COUNT  contagem discreta (entradas de zip)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Limits:
    """Snapshot imutável dos limites — carregado uma vez no import."""

    # ---- Upload ------------------------------------------------------
    upload_max_mb: int = field(
        default_factory=lambda: _env_int("KLT_UPLOAD_MAX_MB", 600)
    )
    upload_chunk_bytes: int = field(
        default_factory=lambda: _env_int("KLT_UPLOAD_CHUNK_BYTES", 1024 * 1024)
    )

    # ---- Arquivos compactados (CBZ/CBR/CB7/CBC) ----------------------
    archive_max_entries: int = field(
        default_factory=lambda: _env_int("KLT_ARCHIVE_MAX_ENTRIES", 5_000)
    )
    archive_max_total_mb: int = field(
        default_factory=lambda: _env_int("KLT_ARCHIVE_MAX_TOTAL_MB", 2_048)
    )
    archive_max_entry_mb: int = field(
        default_factory=lambda: _env_int("KLT_ARCHIVE_MAX_ENTRY_MB", 200)
    )

    # ---- Páginas / imagens -------------------------------------------
    max_pages: int = field(
        default_factory=lambda: _env_int("KLT_MAX_PAGES", 3_000)
    )
    image_max_pixels: int = field(
        # 24000² ≈ 576 MP: cobre scans A4 @ 1200 DPI com folga e ainda
        # aciona o guard do Pillow em imagens verdadeiramente absurdas.
        default_factory=lambda: _env_int("KLT_IMAGE_MAX_PIXELS", 24_000 * 24_000)
    )

    # ---- Timeouts de subprocess (segundos) ---------------------------
    calibre_timeout_seconds: int = field(
        default_factory=lambda: _env_int("KLT_CALIBRE_TIMEOUT_SECONDS", 600)
    )
    kcc_timeout_seconds: int = field(
        default_factory=lambda: _env_int("KLT_KCC_TIMEOUT_SECONDS", 900)
    )
    subprocess_output_max_bytes: int = field(
        default_factory=lambda: _env_int(
            "KLT_SUBPROCESS_OUTPUT_MAX_BYTES", 8 * 1024
        )
    )

    # ---- OCR — atualmente cooperativo, sem interrupção forçada ------
    # (OCRmyPDF é chamado por biblioteca in-process; ver docstring do
    # `subprocess_runner.py` e a limitação registrada na entrega v1.2.2)
    ocr_soft_timeout_seconds: int = field(
        default_factory=lambda: _env_int("KLT_OCR_SOFT_TIMEOUT_SECONDS", 1_800)
    )


limits = Limits()


class LimitsInvalidError(Exception):
    """Startup falhou por limite inválido."""


def validate_limits(current: Optional[Limits] = None) -> Limits:
    """
    Rejeita zeros/negativos, incoerências óbvias e valores estruturalmente
    perigosos. Chamado no startup do app.
    """
    L = current or limits
    checks: list[tuple[str, bool, str]] = [
        ("upload_max_mb", L.upload_max_mb > 0, "> 0"),
        ("upload_chunk_bytes", L.upload_chunk_bytes >= 4096, ">= 4096"),
        ("archive_max_entries", L.archive_max_entries > 0, "> 0"),
        ("archive_max_total_mb", L.archive_max_total_mb > 0, "> 0"),
        ("archive_max_entry_mb", L.archive_max_entry_mb > 0, "> 0"),
        (
            "archive_max_entry_mb",
            L.archive_max_entry_mb <= L.archive_max_total_mb,
            "<= archive_max_total_mb",
        ),
        ("max_pages", L.max_pages > 0, "> 0"),
        ("image_max_pixels", L.image_max_pixels > 0, "> 0"),
        ("calibre_timeout_seconds", L.calibre_timeout_seconds > 0, "> 0"),
        ("kcc_timeout_seconds", L.kcc_timeout_seconds > 0, "> 0"),
        (
            "subprocess_output_max_bytes",
            L.subprocess_output_max_bytes >= 512,
            ">= 512",
        ),
        ("ocr_soft_timeout_seconds", L.ocr_soft_timeout_seconds > 0, "> 0"),
    ]
    bad = [f"{n} deve ser {rule}" for n, ok, rule in checks if not ok]
    if bad:
        raise LimitsInvalidError(
            "Limites de processamento inválidos: " + "; ".join(bad)
        )
    return L
