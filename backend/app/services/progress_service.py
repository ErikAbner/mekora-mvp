"""
Estabilização v1 — Progresso por operação (P4).

Cada operação assíncrona tem um `operation_id`; o progresso é persistido em
storage/output/{job_id}/progress/{operation_id}.json (escrita atômica), com
`updated_at` como heartbeat e `boot_id` do processo para detectar órfãs após
restart do backend.

Regras:
- `report_progress` NUNCA levanta exceção (não pode quebrar o pipeline).
- Uma única operação ativa por job (`job.active_operation`); concorrência → 409.
- Operação registrada por um processo anterior (boot_id diferente) é marcada
  como `interrupted` e liberada — jamais 409 eterno.
- Cancelamento cooperativo: flag em disco checada entre iterações.
- Sem percentual inventado: `total=None` ⇒ indeterminado honesto.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

PROGRESS_DIR_NAME = "progress"

# Identifica o processo atual — muda a cada restart do backend
_BOOT_ID = uuid.uuid4().hex

# Arbitragem intra-processo contra corrida de dois cliques simultâneos
# (duas requests podem ler active_operation=NULL antes de qualquer commit).
# Chave: str(output_dir) — única por job.
_BEGIN_LOCK = threading.Lock()
_ACTIVE_MEM: dict[str, str] = {}

# Mesmo processo: heartbeat mais velho que isto ⇒ operação presa (paranoia)
_STALE_SECONDS = 30 * 60

_INTERRUPTED_MESSAGE = (
    "O processamento foi interrompido pela reinicialização do aplicativo. "
    "Você pode tentar novamente."
)


class OperationInProgressError(Exception):
    """Já existe operação ativa para o job. payload → detail 409."""

    def __init__(self, operation: str) -> None:
        op_type = operation.split(":", 1)[0] if operation else ""
        self.payload: dict[str, Any] = {
            "code": "OPERATION_IN_PROGRESS",
            "message": "Já existe uma operação em andamento para este job. "
                       "Aguarde a conclusão ou cancele antes de iniciar outra.",
            "operation_type": op_type,
        }
        super().__init__(self.payload["message"])


class OperationCancelled(Exception):
    """Cancelamento cooperativo solicitado pelo usuário."""


# ---------------------------------------------------------------------------
# Helpers de arquivo
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _progress_dir(output_dir: Path) -> Path:
    return output_dir / PROGRESS_DIR_NAME


def _progress_path(output_dir: Path, operation_id: str) -> Path:
    return _progress_dir(output_dir) / f"{operation_id}.json"


def _cancel_path(output_dir: Path, operation_id: str) -> Path:
    return _progress_dir(output_dir) / f"{operation_id}.cancel"


def _write_atomic(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def read_progress(output_dir: Path, operation_id: str) -> Optional[dict]:
    try:
        return json.loads(
            _progress_path(output_dir, operation_id).read_text(encoding="utf-8")
        )
    except Exception:
        return None


def parse_active_operation(active: Optional[str]) -> tuple[str, str] | None:
    """'comic_export:abc123' → ('comic_export', 'abc123'); inválido → None."""
    if not active or ":" not in active:
        return None
    op_type, op_id = active.split(":", 1)
    return (op_type, op_id) if op_type and op_id else None


# ---------------------------------------------------------------------------
# Ciclo de vida da operação
# ---------------------------------------------------------------------------

def check_active_operation(active: Optional[str], output_dir: Path) -> str:
    """
    Avalia `job.active_operation`:
    - 'ok'   → nenhuma operação viva (órfãs são marcadas interrupted e liberadas)
    - 'busy' → operação viva no processo atual
    """
    parsed = parse_active_operation(active)
    if parsed is None:
        return "ok"
    _, op_id = parsed
    progress = read_progress(output_dir, op_id)
    if progress is None or progress.get("status") != "running":
        return "ok"  # terminou (ou registro sumiu) sem limpar — liberar

    if progress.get("boot_id") != _BOOT_ID:
        # Backend reiniciou durante a operação → órfã
        mark_interrupted(output_dir, op_id)
        return "ok"

    updated = progress.get("updated_at")
    try:
        age = (
            datetime.now(timezone.utc)
            - datetime.fromisoformat(updated)
        ).total_seconds()
    except Exception:
        age = 0.0
    if age > _STALE_SECONDS:
        mark_interrupted(output_dir, op_id)
        return "ok"

    return "busy"


def begin_operation(job: Any, output_dir: Path, operation_type: str) -> str:
    """
    Inicia uma operação exclusiva para o job. Recupera órfãs automaticamente.
    O caller é responsável pelo commit de `job.active_operation`.

    Protegido por lock intra-processo: dois cliques simultâneos não podem
    registrar duas operações (uma recebe OperationInProgressError).

    Raises:
        OperationInProgressError: operação viva já registrada.
    """
    key = str(output_dir)
    with _BEGIN_LOCK:
        mem_active = _ACTIVE_MEM.get(key)
        if mem_active and check_active_operation(mem_active, output_dir) == "busy":
            raise OperationInProgressError(mem_active)
        if check_active_operation(job.active_operation, output_dir) == "busy":
            raise OperationInProgressError(job.active_operation or "")

        op_id = uuid.uuid4().hex[:12]
        _write_atomic(_progress_path(output_dir, op_id), {
            "operation_id": op_id,
            "operation_type": operation_type,
            "stage": operation_type,
            "current": 0,
            "total": None,
            "percent": None,
            "message": None,
            "status": "running",
            "boot_id": _BOOT_ID,
            "started_at": _now_iso(),
            "updated_at": _now_iso(),
        })
        job.active_operation = f"{operation_type}:{op_id}"
        _ACTIVE_MEM[key] = job.active_operation
        return op_id


def report_progress(
    output_dir: Path,
    operation_id: str,
    stage: str,
    current: int,
    total: Optional[int] = None,
    message: Optional[str] = None,
) -> None:
    """Atualiza o progresso (heartbeat). NUNCA levanta exceção."""
    try:
        data = read_progress(output_dir, operation_id) or {}
        percent = None
        if total and total > 0:
            percent = round(min(100.0, (current / total) * 100.0), 1)
        data.update({
            "operation_id": operation_id,
            "stage": stage,
            "current": current,
            "total": total,
            "percent": percent,
            "message": message,
            "updated_at": _now_iso(),
        })
        data.setdefault("status", "running")
        data.setdefault("boot_id", _BOOT_ID)
        data.setdefault("started_at", _now_iso())
        _write_atomic(_progress_path(output_dir, operation_id), data)
    except Exception:
        pass


def end_operation(
    job: Any,
    output_dir: Path,
    operation_id: str,
    status: str,
    message: Optional[str] = None,
) -> None:
    """Finaliza a operação (completed|failed|cancelled) e libera o job."""
    try:
        data = read_progress(output_dir, operation_id) or {"operation_id": operation_id}
        data["status"] = status
        if message is not None:
            data["message"] = message
        data["updated_at"] = _now_iso()
        _write_atomic(_progress_path(output_dir, operation_id), data)
        _cancel_path(output_dir, operation_id).unlink(missing_ok=True)
    except Exception:
        pass
    job.active_operation = None
    _ACTIVE_MEM.pop(str(output_dir), None)


def mark_interrupted(output_dir: Path, operation_id: str) -> None:
    """Marca operação órfã como interrompida, preservando o registro."""
    try:
        data = read_progress(output_dir, operation_id) or {"operation_id": operation_id}
        data["status"] = "interrupted"
        data["message"] = _INTERRUPTED_MESSAGE
        data["updated_at"] = _now_iso()
        _write_atomic(_progress_path(output_dir, operation_id), data)
        _cancel_path(output_dir, operation_id).unlink(missing_ok=True)
    except Exception:
        pass


def recover_orphan_operation(job: Any, output_dir: Path) -> bool:
    """
    Se `job.active_operation` aponta para operação morta/órfã, limpa o campo.
    Retorna True se houve recuperação. Caller comita.
    """
    if job.active_operation is None:
        return False
    if check_active_operation(job.active_operation, output_dir) == "ok":
        job.active_operation = None
        return True
    return False


# ---------------------------------------------------------------------------
# Cancelamento cooperativo
# ---------------------------------------------------------------------------

def request_cancel(output_dir: Path, operation_id: str) -> None:
    _progress_dir(output_dir).mkdir(parents=True, exist_ok=True)
    _cancel_path(output_dir, operation_id).write_text("cancel", encoding="utf-8")


def cancel_requested(output_dir: Path, operation_id: str) -> bool:
    return _cancel_path(output_dir, operation_id).exists()


def raise_if_cancelled(output_dir: Path, operation_id: str) -> None:
    if cancel_requested(output_dir, operation_id):
        raise OperationCancelled(
            f"Operação {operation_id} cancelada pelo usuário."
        )


# ---------------------------------------------------------------------------
# Consulta para o endpoint /status
# ---------------------------------------------------------------------------

def get_status_progress(active: Optional[str], output_dir: Path) -> Optional[dict]:
    """
    Progresso da operação ativa para anexar ao /status.
    Também detecta e reporta órfã (status='interrupted') uma única vez.
    """
    parsed = parse_active_operation(active)
    if parsed is None:
        return None
    _, op_id = parsed
    # check_active_operation marca órfã como interrupted quando aplicável
    check_active_operation(active, output_dir)
    progress = read_progress(output_dir, op_id)
    if progress is None:
        return None
    progress.pop("boot_id", None)
    return progress
