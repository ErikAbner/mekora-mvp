"""v1.2.2 — escape de conteúdo dinâmico nos HTMLs exportados (P6)."""
from __future__ import annotations


_XSS = "<script>alert('x')</script> & \"quoted\" 'apo' 中文"
_ATTACK_ATTR = "\" onerror=alert(1) x=\""


def _contains_no_raw_script(html: str) -> None:
    """Nenhuma tag <script> injetada deve aparecer com marcação real."""
    # Marcação bruta: <script … > (não escapada)
    assert "<script>" not in html
    # Aspas de fechamento reais (não &quot;) seguidas de handler → seria injection
    # Se o texto aparece com &quot; escapado, tudo bem — é conteúdo visível.
    assert '" onerror=' not in html
    assert "' onerror=" not in html


# ---------------------------------------------------------------------------
# comic_translation_service._build_html_sidecar
# ---------------------------------------------------------------------------

def test_translation_html_escapes_dynamic_text():
    from app.services.comic_translation_service import _build_html_sidecar
    pages = [
        {"page": 1, "blocks": [
            {"text": _XSS, "translated": _ATTACK_ATTR},
        ]},
        {"page": 2, "blocks": [], "error": "<img src=x onerror=alert(1)>"},
    ]
    out = _build_html_sidecar(pages, title=_XSS)
    _contains_no_raw_script(out)
    # Título escapado no <title>
    assert "&lt;script&gt;" in out
    # Chinês preservado
    assert "中文" in out


# ---------------------------------------------------------------------------
# comic_review_service.export_html
# ---------------------------------------------------------------------------

def test_review_html_escapes_dynamic_text():
    from app.services.comic_review_service import export_html
    sidecar = {
        "job_id": _XSS,
        "source_language": "eng",
        "target_language": "por",
        "pages": [
            {
                "page_number": 1,
                "error": "<img src=x onerror=alert(1)>",
                "blocks": [
                    {
                        "block_id": "b<1>",
                        "original_text": _XSS,
                        "translated_text": _ATTACK_ATTR,
                        "reviewed_text": "<b>bold</b>",
                        "review_status": "approved",
                    }
                ],
            },
        ],
    }
    out = export_html(sidecar)
    _contains_no_raw_script(out)
    assert "&lt;b&gt;bold&lt;/b&gt;" in out
    # marcação legítima do template preservada
    assert "<section" in out and "class='block approved'" in out


def test_review_html_bad_status_defaults_to_pending():
    """status arbitrário no bloco não permite quebrar classes CSS."""
    from app.services.comic_review_service import export_html
    sidecar = {
        "job_id": 1, "source_language": "eng", "target_language": "por",
        "pages": [{"page_number": 1, "blocks": [
            {"block_id": "x", "original_text": "a", "translated_text": "b",
             "review_status": "'; alert(1); //"}
        ]}],
    }
    out = export_html(sidecar)
    # A classe injetada não pode aparecer literal
    assert "alert(1)" not in out
    assert "class='block pending'" in out


# ---------------------------------------------------------------------------
# comic_overlay_service.export_overlay_html
# ---------------------------------------------------------------------------

def test_overlay_html_escapes_text_and_sanitizes_style():
    from app.services.comic_overlay_service import export_overlay_html
    sidecar = {
        "job_id": 1, "source_language": "eng", "target_language": "por",
        "pages": [{
            "page_number": 1,
            "image_path": "/storage/output/1/pages/page_001.jpg",
            "blocks": [{
                "block_id": "b1",
                "overlay_visibility": True,
                "overlay_position": [0.1, 0.1, 0.5, 0.2],
                "original_text": _XSS,
                "translated_text": _ATTACK_ATTR,
                "reviewed_text": _XSS,
                "review_status": "'; alert(1); //",
                "overlay_style": {
                    "border_color": "javascript:alert(1)",  # deve ser rejeitado
                    "text_color": "red; }; body { background: red",
                    "bg_opacity": 5.0,   # fora do intervalo → default
                    "font_size": "'; alert(1); //",  # não-numérico → default
                    "text_align": "center; }; }",  # não permitido → left
                },
            }],
        }],
    }
    out = export_overlay_html(sidecar)
    _contains_no_raw_script(out)
    assert "javascript:alert" not in out
    assert "onerror=alert" not in out
    # Cores/valores hostis substituídos por defaults seguros
    assert "javascript:" not in out
    assert "background: red" not in out


def test_overlay_html_rejects_javascript_src():
    """image_path malicioso não deve virar src no HTML."""
    from app.services.comic_overlay_service import export_overlay_html
    sidecar = {
        "job_id": 1, "source_language": "e", "target_language": "p",
        "pages": [{
            "page_number": 1,
            "image_path": "javascript:alert(1)",
            "blocks": [],
        }],
    }
    out = export_overlay_html(sidecar)
    assert "javascript:" not in out
    # Se src for inválido, nenhum <img> deve aparecer
    assert "<img" not in out


def test_overlay_html_preserves_unicode():
    from app.services.comic_overlay_service import export_overlay_html
    sidecar = {
        "job_id": 1, "source_language": "e", "target_language": "p",
        "pages": [{
            "page_number": 1,
            "image_path": "/storage/output/1/pages/page_001.jpg",
            "blocks": [{
                "block_id": "b1", "overlay_visibility": True,
                "overlay_position": [0.1, 0.1, 0.5, 0.2],
                "translated_text": "こんにちは — Olá 你好 مرحبا",
                "review_status": "approved",
            }],
        }],
    }
    out = export_overlay_html(sidecar)
    for token in ("こんにちは", "Olá", "你好", "مرحبا"):
        assert token in out
