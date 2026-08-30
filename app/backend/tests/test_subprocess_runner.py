"""v1.2.2 — helper de execução controlada (P4)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

from app.services.subprocess_runner import (
    ExternalToolError,
    _redact_public,
    run_external,
)


def test_success_returns_completed_process(tmp_path):
    r = run_external(
        [sys.executable, "-c", "print('hello'); import sys; sys.stderr.write('warn')"],
        timeout_seconds=10,
        tool_label="python",
    )
    assert r.returncode == 0
    assert "hello" in r.stdout


def test_nonzero_returncode_raises_public_message():
    with pytest.raises(ExternalToolError) as exc:
        run_external(
            [sys.executable, "-c", "import sys; sys.exit(3)"],
            timeout_seconds=10,
            tool_label="python",
        )
    assert exc.value.code == "TOOL_FAILED"
    assert "python" in exc.value.public_message
    # Mensagem pública NÃO deve conter path absoluto do executable
    assert not exc.value.public_message.startswith("/")


def test_timeout_kills_process_and_raises():
    start = time.monotonic()
    with pytest.raises(ExternalToolError) as exc:
        run_external(
            [sys.executable, "-c", "import time; time.sleep(30)"],
            timeout_seconds=1,
            tool_label="python",
        )
    elapsed = time.monotonic() - start
    assert exc.value.code == "TOOL_TIMEOUT"
    assert elapsed < 5, f"não encerrou em tempo hábil: {elapsed:.1f}s"


def test_tool_not_found_raises_specific_code():
    with pytest.raises(ExternalToolError) as exc:
        run_external(
            ["/no/such/binary/really/absolutely/not/here"],
            timeout_seconds=5,
            tool_label="ghost",
        )
    assert exc.value.code in ("TOOL_NOT_FOUND", "TOOL_LAUNCH_FAILED")


def test_output_is_truncated():
    """stdout enorme é cortado por output_limit_bytes."""
    r = run_external(
        [sys.executable, "-c", "print('X' * 100000)"],
        timeout_seconds=10,
        tool_label="python",
        output_limit_bytes=1024,
    )
    assert len(r.stdout) <= 1200  # inclui marcador de truncamento
    assert "truncated" in r.stdout


def test_redact_public_hides_home_and_project():
    home = str(Path.home())
    txt = f"error in {home}/secret/thing and /tmp/foo/bar/baz"
    redacted = _redact_public(txt)
    assert home not in redacted
    assert "~" in redacted or "<path>" in redacted


def test_input_path_out_of_scope_rejected(tmp_path):
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    outside = tmp_path / "outside.txt"
    outside.write_bytes(b"content")
    with pytest.raises(ExternalToolError) as exc:
        run_external(
            [sys.executable, "-c", "pass"],
            timeout_seconds=5,
            tool_label="python",
            input_path=outside,
            allowed_roots=[allowed],
        )
    assert exc.value.code == "INPUT_PATH_OUT_OF_SCOPE"


def test_input_path_inside_scope_ok(tmp_path):
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    inside = allowed / "file.txt"
    inside.write_bytes(b"content")
    r = run_external(
        [sys.executable, "-c", "pass"],
        timeout_seconds=5,
        tool_label="python",
        input_path=inside,
        allowed_roots=[allowed],
    )
    assert r.returncode == 0


def test_public_message_of_failure_has_no_absolute_path():
    """A mensagem retornada ao caller nunca deve conter path absoluto."""
    from pathlib import Path
    home = str(Path.home())
    with pytest.raises(ExternalToolError) as exc:
        run_external(
            [sys.executable, "-c", f"import sys; sys.stderr.write('bad in {home}/x'); sys.exit(1)"],
            timeout_seconds=10,
            tool_label="python",
        )
    assert home not in exc.value.public_message
