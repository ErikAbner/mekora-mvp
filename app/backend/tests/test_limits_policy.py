"""v1.2.2 — política central de limites (P1)."""
from __future__ import annotations

import pytest


def test_defaults_positive_and_coherent():
    from app.core.limits import limits
    assert limits.upload_max_mb > 0
    assert limits.archive_max_entries > 0
    assert limits.archive_max_entry_mb <= limits.archive_max_total_mb
    assert limits.max_pages > 0
    assert limits.image_max_pixels > 0
    assert limits.calibre_timeout_seconds > 0
    assert limits.kcc_timeout_seconds > 0
    assert limits.subprocess_output_max_bytes >= 512


def test_validate_rejects_zero_and_negatives():
    from app.core.limits import Limits, LimitsInvalidError, validate_limits
    bad = Limits(
        upload_max_mb=0, upload_chunk_bytes=1024*1024,
        archive_max_entries=1, archive_max_total_mb=1, archive_max_entry_mb=1,
        max_pages=1, image_max_pixels=1,
        calibre_timeout_seconds=1, kcc_timeout_seconds=1,
        subprocess_output_max_bytes=1024, ocr_soft_timeout_seconds=1,
    )
    with pytest.raises(LimitsInvalidError):
        validate_limits(bad)


def test_validate_rejects_incoherent_entry_vs_total():
    from app.core.limits import Limits, LimitsInvalidError, validate_limits
    bad = Limits(
        upload_max_mb=100, upload_chunk_bytes=1024*1024,
        archive_max_entries=10, archive_max_total_mb=10, archive_max_entry_mb=999,
        max_pages=100, image_max_pixels=1000, calibre_timeout_seconds=1,
        kcc_timeout_seconds=1, subprocess_output_max_bytes=1024,
        ocr_soft_timeout_seconds=1,
    )
    with pytest.raises(LimitsInvalidError):
        validate_limits(bad)
