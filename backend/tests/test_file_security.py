"""
v1.2.1 — Testes de segurança do acesso a arquivos.

O mount amplo de /storage foi substituído por rotas controladas com allowlist.
Estes testes comprovam que banco, config, uploads, backups, manifests internos,
progress, traversal e symlinks NÃO são acessíveis, e que os artefatos
legítimos continuam funcionando.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest


# A partir de 30/08 um arquivo só é servido se houver um TRABALHO registrado
# para ele, e o endereço é o token do trabalho — não o número (DEC-0039 §5).
#
# Antes, qualquer pasta dentro de `output/` era servida, existisse ou não um
# registro. Estes testes usavam o número 1 sem criar trabalho nenhum, e passavam
# — o que mostra exatamente o que mudou.
@pytest.fixture
def endereco(test_engine):
    """Cria um trabalho e devolve o endereço público dele."""
    from sqlalchemy.orm import Session

    from app.models.processing_job import ProcessingJob

    with Session(test_engine) as db:
        job = ProcessingJob(original_filename="arquivo.pdf", status="completed")
        db.add(job)
        db.commit()
        return job.token_publico


def _make_png(path: Path) -> Path:
    from PIL import Image
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (10, 10), (100, 100, 100)).save(str(path), "PNG")
    return path


def _make_jpg(path: Path) -> Path:
    from PIL import Image
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (10, 10), (50, 50, 50)).save(str(path), "JPEG")
    return path


# ---------------------------------------------------------------------------
# Recursos sensíveis → 404
# ---------------------------------------------------------------------------

def test_database_not_served(client, tmp_storage):
    (tmp_storage / "kindle_tool.db").write_bytes(b"sqlite fake")
    r = client.get("/storage/kindle_tool.db")
    assert r.status_code == 404


def test_config_not_served(client, tmp_storage):
    (tmp_storage / "config.json").write_text('{"smtp": "secreto"}')
    assert client.get("/storage/config.json").status_code == 404
    (tmp_storage / "config_presets.json").write_text("[]")
    assert client.get("/storage/config_presets.json").status_code == 404


def test_backup_not_served(client, tmp_storage):
    b = tmp_storage / "backups"
    b.mkdir(parents=True, exist_ok=True)
    (b / "code_snapshot.tar.gz").write_bytes(b"tar fake")
    assert client.get("/storage/backups/code_snapshot.tar.gz").status_code == 404


def test_input_upload_not_served(client, tmp_storage):
    inp = tmp_storage / "input"
    inp.mkdir(parents=True, exist_ok=True)
    (inp / "1_original.pdf").write_bytes(b"%PDF fake")
    assert client.get("/storage/input/1_original.pdf").status_code == 404


def test_models_and_logs_not_served(client, tmp_storage):
    (tmp_storage / "models").mkdir(parents=True, exist_ok=True)
    (tmp_storage / "models" / "m.bin").write_bytes(b"x")
    assert client.get("/storage/models/m.bin").status_code == 404
    (tmp_storage / "logs").mkdir(parents=True, exist_ok=True)
    (tmp_storage / "logs" / "app.log").write_text("log")
    assert client.get("/storage/logs/app.log").status_code == 404


def test_internal_manifests_and_progress_not_served(client, tmp_storage):
    out = tmp_storage / "output" / "1"
    out.mkdir(parents=True, exist_ok=True)
    (out / "comic_final_manifest.json").write_text("{}")
    (out / "comic_render.json").write_text("{}")
    (out / "comic_export").mkdir(exist_ok=True)
    (out / "comic_export" / "comic_export_manifest.json").write_text("{}")
    (out / "progress").mkdir(exist_ok=True)
    (out / "progress" / "abc123.json").write_text("{}")

    assert client.get("/storage/output/1/comic_final_manifest.json").status_code == 404
    assert client.get("/storage/output/1/comic_render.json").status_code == 404
    assert client.get("/storage/output/1/comic_export/comic_export_manifest.json").status_code == 404
    assert client.get("/storage/output/1/progress/abc123.json").status_code == 404


def test_hidden_files_not_served(client, tmp_storage):
    out = tmp_storage / "output" / "1"
    out.mkdir(parents=True, exist_ok=True)
    (out / ".segredo").write_text("x")
    assert client.get("/storage/output/1/.segredo").status_code == 404


# ---------------------------------------------------------------------------
# Traversal e symlink → rejeitados
# ---------------------------------------------------------------------------

def test_path_traversal_rejected(client, tmp_storage):
    (tmp_storage / "kindle_tool.db").write_bytes(b"sqlite fake")
    # Literal (o TestClient não normaliza URLs já montadas com %2e)
    for path in (
        "/storage/output/1/..%2F..%2Fkindle_tool.db",
        "/storage/output/1/%2e%2e/%2e%2e/kindle_tool.db",
        "/storage/temp/1/..%2Fconfig.json",
    ):
        r = client.get(path)
        assert r.status_code == 404, path


def test_symlink_escape_rejected(client, tmp_storage):
    secret = tmp_storage / "kindle_tool.db"
    secret.write_bytes(b"sqlite fake")
    out = tmp_storage / "output" / "1" / "final_pages"
    out.mkdir(parents=True, exist_ok=True)
    link = out / "page_001.png"
    os.symlink(secret, link)  # symlink com nome permitido apontando para fora
    r = client.get("/storage/output/1/final_pages/page_001.png")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Artefatos autorizados → funcionam
# ---------------------------------------------------------------------------

def test_allowed_page_image_served(client, tmp_storage, endereco):
    _make_jpg(tmp_storage / "output" / "1" / "pages" / "page_001.jpg")
    r = client.get(f"/storage/output/{endereco}/pages/page_001.jpg")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"


def test_allowed_final_and_export_served(client, tmp_storage, endereco):
    _make_png(tmp_storage / "output" / "1" / "final_pages" / "page_001.png")
    assert client.get(f"/storage/output/{endereco}/final_pages/page_001.png").status_code == 200

    ce = tmp_storage / "output" / "1" / "comic_export"
    ce.mkdir(parents=True, exist_ok=True)
    (ce / "meu-manga.epub").write_bytes(b"PK epub fake")
    r = client.get(f"/storage/output/{endereco}/comic_export/meu-manga.epub")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/epub+zip"


def test_allowed_translation_sidecar_and_archives_served(client, tmp_storage, endereco):
    out = tmp_storage / "output" / "1"
    out.mkdir(parents=True, exist_ok=True)
    (out / "comic_translation.json").write_text('{"pages": []}')
    (out / "final_pages.cbz").write_bytes(b"PK fake")
    (out / "documento.epub").write_bytes(b"PK fake")
    assert client.get(f"/storage/output/{endereco}/comic_translation.json").status_code == 200
    assert client.get(f"/storage/output/{endereco}/final_pages.cbz").status_code == 200
    assert client.get(f"/storage/output/{endereco}/documento.epub").status_code == 200


def test_html_gerado_nao_pode_executar_codigo_da_aplicacao(client, tmp_storage, endereco):
    out = tmp_storage / "output" / "1"
    out.mkdir(parents=True, exist_ok=True)
    (out / "comic_review.html").write_text("<p>revisão</p>")

    resposta = client.get(f"/storage/output/{endereco}/comic_review.html")

    assert resposta.status_code == 200
    csp = resposta.headers["content-security-policy"]
    assert "default-src 'none'" in csp
    assert "sandbox" in csp
    assert resposta.headers["x-content-type-options"] == "nosniff"


def test_epub_com_pontuacao_do_titulo_e_servido(client, tmp_storage, endereco):
    """O nome real de um livro não pode transformar uma conversão válida em 404."""
    out = tmp_storage / "output" / "1"
    out.mkdir(parents=True, exist_ok=True)
    nome = "Entrevistas, produto & pessoas (Ana D'Ávila).web.epub"
    (out / nome).write_bytes(b"PK epub fake")

    r = client.get(f"/storage/output/{endereco}/{nome}")

    assert r.status_code == 200
    assert r.headers["content-type"] == "application/epub+zip"


def test_allowed_thumbnail_served(client, tmp_storage, endereco):
    _make_png(tmp_storage / "temp" / "1" / "page_0.png")
    r = client.get(f"/storage/temp/{endereco}/page_0.png")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"


def test_temp_only_thumbnails_served(client, tmp_storage):
    """No temp, SOMENTE page_0..4.png — nada de OCR intermediário etc."""
    t = tmp_storage / "temp" / "1"
    t.mkdir(parents=True, exist_ok=True)
    (t / "doc_ocr.pdf").write_bytes(b"%PDF fake")
    (t / "page_7.png").write_bytes(b"x")
    assert client.get("/storage/temp/1/doc_ocr.pdf").status_code == 404
    assert client.get("/storage/temp/1/page_7.png").status_code == 404


def test_cross_job_directory_rejected(client, tmp_storage):
    """Artefato existe no job 2; job 1 não pode alcançá-lo."""
    _make_png(tmp_storage / "output" / "2" / "final_pages" / "page_001.png")
    assert client.get("/storage/output/1/final_pages/page_001.png").status_code == 404
    # e sem listagem de diretórios
    assert client.get("/storage/output/2/final_pages/").status_code == 404
    assert client.get("/storage/output/2/").status_code == 404
