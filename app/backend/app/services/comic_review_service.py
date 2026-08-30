"""
Fase E — Revisão humana assistida do sidecar de tradução de quadrinhos/mangá.

NÃO edita imagens.
NÃO sobrescreve o sidecar bruto (comic_translation.json).
Gera e mantém comic_review.json como artefato de revisão separado.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ReviewBlock = dict[str, Any]
ReviewPage = dict[str, Any]
ReviewSidecar = dict[str, Any]

_VALID_STATUSES = {"pending", "approved", "edited", "skipped"}


# ---------------------------------------------------------------------------
# ID de bloco
# ---------------------------------------------------------------------------

def _block_id(page_number: int, block_index: int) -> str:
    return f"p{page_number}_b{block_index}"


# ---------------------------------------------------------------------------
# Inicialização — converte formato Fase D → Fase E
# ---------------------------------------------------------------------------

def initialize_review(raw_sidecar_path: Path) -> ReviewSidecar:
    """
    Cria um sidecar de revisão inicial a partir do sidecar bruto da Fase D.

    NÃO sobrescreve o sidecar bruto.
    NÃO salva em disco — apenas retorna o dict.
    """
    raw = json.loads(raw_sidecar_path.read_text(encoding="utf-8"))

    pages: list[ReviewPage] = []
    for raw_page in raw.get("pages", []):
        # Fase D usa "page"; normalizar para "page_number"
        page_num = raw_page.get("page_number") or raw_page.get("page", 0)
        raw_blocks = raw_page.get("blocks", [])
        blocks: list[ReviewBlock] = []
        for idx, raw_block in enumerate(raw_blocks):
            blocks.append({
                "block_id": _block_id(page_num, idx),
                "original_text": raw_block.get("text", ""),
                "translated_text": raw_block.get("translated", ""),
                "reviewed_text": "",
                "review_status": "pending",
                "confidence": None,
                "bbox": None,
            })
        pages.append({
            "page_number": page_num,
            "blocks": blocks,
            "error": raw_page.get("error"),
        })

    return {
        "job_id": raw.get("job_id"),
        "source_language": raw.get("source_language", ""),
        "target_language": raw.get("target_language", ""),
        "pages": pages,
    }


# ---------------------------------------------------------------------------
# Carregar / salvar
# ---------------------------------------------------------------------------

def load_review(review_path: Path) -> ReviewSidecar:
    return json.loads(review_path.read_text(encoding="utf-8"))


def save_review(review_path: Path, data: ReviewSidecar) -> None:
    review_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Aplicar patches
# ---------------------------------------------------------------------------

def apply_patches(data: ReviewSidecar, patches: list[dict]) -> ReviewSidecar:
    """
    Aplica uma lista de patches em blocos específicos.
    Cada patch: {"block_id": str, "reviewed_text"?: str, "review_status"?: str}

    - Se reviewed_text for alterado e review_status não for enviado,
      define review_status como "edited" automaticamente.
    """
    patch_map: dict[str, dict] = {p["block_id"]: p for p in patches}

    for page in data["pages"]:
        for block in page["blocks"]:
            bid = block["block_id"]
            if bid not in patch_map:
                continue
            patch = patch_map[bid]
            new_text = patch.get("reviewed_text")
            new_status = patch.get("review_status")

            if new_text is not None:
                block["reviewed_text"] = new_text
                # Auto-status: se texto foi editado e não há status explícito
                if new_status is None and new_text.strip():
                    block["review_status"] = "edited"
            if new_status is not None and new_status in _VALID_STATUSES:
                block["review_status"] = new_status

    return data


# ---------------------------------------------------------------------------
# Estatísticas
# ---------------------------------------------------------------------------

def compute_stats(data: ReviewSidecar) -> dict[str, int]:
    counts: dict[str, int] = {"total": 0, "pending": 0, "approved": 0, "edited": 0, "skipped": 0}
    for page in data["pages"]:
        for block in page.get("blocks", []):
            counts["total"] += 1
            status = block.get("review_status", "pending")
            if status in counts:
                counts[status] += 1
    return counts


# ---------------------------------------------------------------------------
# Exportação
# ---------------------------------------------------------------------------

def _e(text: Any) -> str:
    """Escape HTML consistente para texto dinâmico (P6)."""
    import html as _html
    return _html.escape(str(text or ""), quote=True)


_STATUS_ALLOWED = {"pending", "approved", "edited", "skipped"}


def _safe_status(status: Any) -> str:
    s = str(status or "pending")
    return s if s in _STATUS_ALLOWED else "pending"


def export_html(data: ReviewSidecar) -> str:
    job_id = _e(data.get("job_id", "?"))
    src = _e(data.get("source_language", ""))
    tgt = _e(data.get("target_language", ""))

    parts = [
        "<!DOCTYPE html>",
        "<html lang='pt'>",
        "<head><meta charset='utf-8'>",
        f"<title>Revisão — Job {job_id}</title>",
        "<style>",
        "body{font-family:system-ui,sans-serif;max-width:860px;margin:auto;padding:1.5rem;color:#1a1a1a}",
        "nav{display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}",
        "nav a{text-decoration:none;color:#2563eb;font-size:.875rem}",
        "section{border:1px solid #e5e7eb;border-radius:.75rem;padding:1rem;margin-bottom:1.5rem}",
        "h2{font-size:1rem;font-weight:600;color:#374151;margin-bottom:.75rem}",
        ".block{border-left:3px solid #d1d5db;padding-left:.75rem;margin-bottom:.75rem}",
        ".approved{border-color:#16a34a}",
        ".edited{border-color:#2563eb}",
        ".skipped{border-color:#9ca3af;opacity:.7}",
        ".pending{border-color:#f59e0b}",
        ".label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:.25rem}",
        ".original{color:#6b7280;font-size:.875rem;white-space:pre-wrap}",
        ".translated{color:#374151;font-size:.875rem;white-space:pre-wrap}",
        ".reviewed{color:#15803d;font-size:.875rem;font-weight:500;white-space:pre-wrap}",
        ".error{color:#dc2626;font-size:.875rem}",
        ".meta{font-size:.7rem;color:#9ca3af;margin-top:.25rem}",
        "</style></head><body>",
        f"<h1>Revisão — Job {job_id}</h1>",
        f"<p style='color:#6b7280;font-size:.875rem'>{src} → {tgt}</p>",
        "<p style='color:#9ca3af;font-size:.75rem'>Esta revisão é apenas do texto. Nenhuma imagem foi alterada.</p>",
        "<nav>",
    ]
    for page in data["pages"]:
        pn = int(page["page_number"])
        parts.append(f"<a href='#page-{pn}'>Página {pn}</a>")
    parts.append("</nav>")

    for page in data["pages"]:
        pn = int(page["page_number"])
        parts.append(f"<section id='page-{pn}'><h2>Página {pn}</h2>")
        if page.get("error"):
            parts.append(f"<p class='error'>Erro OCR: {_e(page['error'])}</p>")
        for block in page.get("blocks", []):
            status = _safe_status(block.get("review_status", "pending"))
            parts.append(f"<div class='block {status}'>")
            parts.append("<div class='label'>Original</div>")
            parts.append(f"<div class='original'>{_e(block.get('original_text', ''))}</div>")
            parts.append("<div class='label' style='margin-top:.5rem'>Tradução automática</div>")
            parts.append(f"<div class='translated'>{_e(block.get('translated_text', ''))}</div>")
            if block.get("reviewed_text"):
                parts.append("<div class='label' style='margin-top:.5rem'>Revisado ✓</div>")
                parts.append(f"<div class='reviewed'>{_e(block['reviewed_text'])}</div>")
            parts.append(f"<div class='meta'>{status} · {_e(block.get('block_id', ''))}</div>")
            parts.append("</div>")
        parts.append("</section>")

    parts.append("</body></html>")
    return "\n".join(parts)


def export_markdown(data: ReviewSidecar) -> str:
    job_id = data.get("job_id", "?")
    src = data.get("source_language", "")
    tgt = data.get("target_language", "")

    lines = [
        f"# Revisão — Job {job_id}",
        "",
        f"**Idiomas:** {src} → {tgt}",
        "",
        "> Esta revisão é apenas do texto. Nenhuma imagem foi alterada.",
        "",
    ]
    for page in data["pages"]:
        pn = page["page_number"]
        lines.append(f"## Página {pn}")
        lines.append("")
        if page.get("error"):
            lines.append(f"> **Erro OCR:** {page['error']}")
            lines.append("")
        for block in page.get("blocks", []):
            status = block.get("review_status", "pending")
            reviewed = block.get("reviewed_text", "")
            lines.append(f"### `{block.get('block_id', '')}` · {status}")
            lines.append("")
            lines.append(f"**Original:** {block.get('original_text', '')}")
            lines.append("")
            lines.append(f"**Tradução:** {block.get('translated_text', '')}")
            lines.append("")
            if reviewed:
                lines.append(f"**Revisado:** {reviewed}")
                lines.append("")
            lines.append("---")
            lines.append("")
    return "\n".join(lines)
