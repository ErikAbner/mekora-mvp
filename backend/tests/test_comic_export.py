"""
Estabilização v1 — Testes do export final de quadrinhos.

Cobrem:
- resolução da fonte (finished > final > 409), agnóstica a extensão
- validação de páginas (JPEG, PNG, misto, duplicata lógica, ilegível, ausente)
- proveniência real por página + translation_state (4 estados)
- staging CBZ determinístico, atomicidade, cache/força
- título/autor no comando KCC
- política de envio A–D (comic traduzido NUNCA envia o original)
- migração de colunas em banco antigo preservando dados
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from app.services.comic_export_service import (
    ComicExportFailedError,
    ComicExportSourceError,
    compute_translation_state,
    resolve_export_source,
    run_comic_export,
    validate_export_artifact,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_image(path: Path, color=(120, 60, 200), size=(40, 60)) -> Path:
    from PIL import Image
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, color)
    fmt = "PNG" if path.suffix.lower() == ".png" else "JPEG"
    img.save(str(path), fmt)
    return path


def _write_final_manifest(output_dir: Path, pages: list[dict]) -> None:
    manifest = {
        "job_id": int(output_dir.name),
        "total_pages": len(pages),
        "pages": pages,
        "exported_pages": sum(1 for p in pages if p.get("final_serve_path")),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "comic_final_manifest.json").write_text(
        json.dumps(manifest), encoding="utf-8"
    )


def _setup_final_source(
    output_dir: Path,
    count: int = 2,
    ext: str = ".png",
    variants: dict[int, str] | None = None,
    exts: dict[int, str] | None = None,
) -> None:
    """Cria final_pages/ + comic_final_manifest.json completos."""
    job = output_dir.name
    pages = []
    for n in range(1, count + 1):
        e = (exts or {}).get(n, ext)
        fname = f"page_{n:03d}{e}"
        _make_image(output_dir / "final_pages" / fname)
        pages.append({
            "page_number": n,
            "selected_variant": (variants or {}).get(n, "render_overlay"),
            "final_serve_path": f"/storage/output/{job}/final_pages/{fname}",
        })
    _write_final_manifest(output_dir, pages)


def _setup_finish_source(output_dir: Path, count: int = 2) -> None:
    job = output_dir.name
    pages = []
    for n in range(1, count + 1):
        fname = f"page_{n:03d}.png"
        _make_image(output_dir / "finished_pages" / fname, color=(10, 200, 10))
        pages.append({
            "page_number": n,
            "source_variant": "render_overlay",
            "finished_path": f"/storage/output/{job}/finished_pages/{fname}",
        })
    manifest = {"pages": pages, "zip_path": None, "cbz_path": None}
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "comic_finish_manifest.json").write_text(
        json.dumps(manifest), encoding="utf-8"
    )


def _write_translation_sidecar(output_dir: Path, pages_with_blocks: list[int], total: int) -> None:
    pages = []
    for n in range(1, total + 1):
        blocks = [{"block_id": f"b{n}", "text": "olá"}] if n in pages_with_blocks else []
        pages.append({"page_number": n, "blocks": blocks})
    (output_dir / "comic_translation.json").write_text(
        json.dumps({"pages": pages}), encoding="utf-8"
    )


def _fake_epub(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip")
        zf.writestr("OEBPS/content.opf", "<package/>")
    return path


# ---------------------------------------------------------------------------
# Resolução da fonte
# ---------------------------------------------------------------------------

def test_resolve_missing_source_raises(tmp_path: Path) -> None:
    out = tmp_path / "42"
    out.mkdir()
    with pytest.raises(ComicExportSourceError) as exc:
        resolve_export_source(out)
    assert exc.value.payload["code"] == "EXPORT_SOURCE_MISSING"
    assert exc.value.payload["next_step"] == "finalize"


def test_resolve_final_pages_png(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=3, ext=".png")
    res = resolve_export_source(out)
    assert res["source"] == "final_pages"
    assert [e["page_id"] for e in res["pages"]] == [1, 2, 3]


def test_resolve_final_pages_jpeg(tmp_path: Path) -> None:
    """Resolver não pode assumir PNG — aceita JPEG."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2, ext=".jpg")
    res = resolve_export_source(out)
    assert res["source"] == "final_pages"
    assert all(e["path"].suffix == ".jpg" for e in res["pages"])


def test_resolve_mixed_extensions_valid(tmp_path: Path) -> None:
    """Conjunto misto PNG+JPEG entre páginas diferentes é válido."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2, exts={1: ".png", 2: ".jpg"})
    res = resolve_export_source(out)
    assert len(res["pages"]) == 2


def test_resolve_finish_priority_over_final(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    _setup_finish_source(out, count=2)
    res = resolve_export_source(out)
    assert res["source"] == "finished_pages"


def test_resolve_incomplete_final_raises_with_missing(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    # Remove o export da página 2 no manifest
    m = json.loads((out / "comic_final_manifest.json").read_text())
    m["pages"][1]["final_serve_path"] = None
    (out / "comic_final_manifest.json").write_text(json.dumps(m))
    with pytest.raises(ComicExportSourceError) as exc:
        resolve_export_source(out)
    assert exc.value.payload["code"] == "EXPORT_SOURCE_INCOMPLETE"
    assert 2 in exc.value.payload["missing_pages"]
    assert exc.value.payload["next_step"] == "finalize"


def test_resolve_missing_file_raises(tmp_path: Path) -> None:
    """Página listada no manifest mas arquivo ausente em disco."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    (out / "final_pages" / "page_002.png").unlink()
    with pytest.raises(ComicExportSourceError) as exc:
        resolve_export_source(out)
    assert 2 in exc.value.payload["missing_pages"]


def test_resolve_unreadable_image_raises(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    (out / "final_pages" / "page_001.png").write_bytes(b"nao sou uma imagem")
    with pytest.raises(ComicExportSourceError) as exc:
        resolve_export_source(out)
    assert 1 in exc.value.payload["missing_pages"]


def test_resolve_logical_duplicate_raises(tmp_path: Path) -> None:
    """page_001.png E page_001.jpg no mesmo diretório → duplicata lógica."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2, ext=".png")
    _make_image(out / "final_pages" / "page_001.jpg")
    with pytest.raises(ComicExportSourceError) as exc:
        resolve_export_source(out)
    assert 1 in exc.value.payload["missing_pages"]


def test_resolve_incomplete_finish_falls_back_to_final(tmp_path: Path) -> None:
    """Finish incompleto (página sem finished_path) cai para final_pages."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    _setup_finish_source(out, count=2)
    m = json.loads((out / "comic_finish_manifest.json").read_text())
    m["pages"][0]["finished_path"] = None
    (out / "comic_finish_manifest.json").write_text(json.dumps(m))
    res = resolve_export_source(out)
    assert res["source"] == "final_pages"


# ---------------------------------------------------------------------------
# translation_state por proveniência real
# ---------------------------------------------------------------------------

def _pages_entries(variants: dict[int, str]) -> list[dict]:
    return [
        {
            "page_id": n,
            "selected_variant": v,
            "visual_translation_applied": v == "render_overlay",
        }
        for n, v in variants.items()
    ]


def test_translation_state_not_applicable_when_no_translation(tmp_path: Path) -> None:
    state = compute_translation_state(
        tmp_path, _pages_entries({1: "original"}), comic_translation_done=False
    )
    assert state == "not_applicable"


def test_translation_state_full(tmp_path: Path) -> None:
    _write_translation_sidecar(tmp_path, pages_with_blocks=[1, 2], total=2)
    state = compute_translation_state(
        tmp_path,
        _pages_entries({1: "render_overlay", 2: "render_overlay"}),
        comic_translation_done=True,
    )
    assert state == "full"


def test_translation_state_partial(tmp_path: Path) -> None:
    _write_translation_sidecar(tmp_path, pages_with_blocks=[1, 2], total=2)
    state = compute_translation_state(
        tmp_path,
        _pages_entries({1: "render_overlay", 2: "original"}),
        comic_translation_done=True,
    )
    assert state == "partial"


def test_translation_state_none(tmp_path: Path) -> None:
    """Status do job 'done' mas todas as páginas selecionadas são originais."""
    _write_translation_sidecar(tmp_path, pages_with_blocks=[1, 2], total=2)
    state = compute_translation_state(
        tmp_path,
        _pages_entries({1: "original", 2: "original"}),
        comic_translation_done=True,
    )
    assert state == "none"


# ---------------------------------------------------------------------------
# run_comic_export — staging, atomicidade, cache
# ---------------------------------------------------------------------------

def test_export_cbz_only_creates_staging_and_manifest(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=3, exts={1: ".png", 2: ".jpg", 3: ".png"})
    manifest = run_comic_export(42, out, slug="Meu Comic", build_epub=False)

    cbz = Path(manifest["staging_cbz"])
    assert cbz.exists()
    with zipfile.ZipFile(cbz) as zf:
        names = zf.namelist()
    # Ordem preservada + renumeração sequencial + extensão original
    assert names == ["page_001.png", "page_002.jpg", "page_003.png"]

    saved = json.loads((out / "comic_export" / "comic_export_manifest.json").read_text())
    assert saved["manifest_version"] == 1
    assert saved["source"] == "final_pages"
    assert saved["page_count"] == 3
    assert saved["epub_path"] is None
    # Proveniência por página
    for entry in saved["pages"]:
        assert {"file", "page_id", "selected_variant", "origin",
                "visual_translation_applied", "size", "mtime"} <= set(entry)


def test_export_never_uses_input_path(tmp_path: Path) -> None:
    """Sem fonte final → erro; nunca cai para um 'original'."""
    out = tmp_path / "42"
    out.mkdir()
    (out.parent / "input_original.cbz").write_bytes(b"fake")
    with pytest.raises(ComicExportSourceError):
        run_comic_export(42, out, slug="x", build_epub=False)
    assert not (out / "comic_export").exists() or not list(
        (out / "comic_export").glob("*.cbz")
    )


def test_export_cache_and_force(tmp_path: Path) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    m1 = run_comic_export(42, out, slug="x", build_epub=False)
    assert "cached" not in m1
    m2 = run_comic_export(42, out, slug="x", build_epub=False)
    assert m2.get("cached") is True
    # Mudança em uma página invalida o cache
    _make_image(out / "final_pages" / "page_001.png", color=(1, 2, 3))
    m3 = run_comic_export(42, out, slug="x", build_epub=False)
    assert "cached" not in m3
    m4 = run_comic_export(42, out, slug="x", build_epub=False, force=True)
    assert "cached" not in m4


def test_export_epub_with_fake_kcc(tmp_path: Path, monkeypatch) -> None:
    out = tmp_path / "42"
    _setup_final_source(out, count=2)
    _write_translation_sidecar(out, pages_with_blocks=[1, 2], total=2)

    import app.services.kcc_service as kcc

    def fake_convert(input_path, output_dir, **kwargs):
        return _fake_epub(Path(output_dir) / f"{Path(input_path).stem}.epub")

    monkeypatch.setattr(kcc, "convert_comic", fake_convert)

    manifest = run_comic_export(
        42, out, slug="manga", title="T", author="A",
        comic_translation_done=True, build_epub=True,
    )
    assert manifest["epub_path"] and Path(manifest["epub_path"]).exists()
    assert manifest["translation_state"] == "full"
    assert manifest["translation_included"] is True
    assert manifest["epub_serve_path"].endswith("/comic_export/manga.epub")


def test_export_atomic_on_kcc_failure(tmp_path: Path, monkeypatch) -> None:
    """Falha no KCC não deixa EPUB parcial nem manifest gravado."""
    out = tmp_path / "42"
    _setup_final_source(out, count=2)

    import app.services.kcc_service as kcc

    def failing_convert(input_path, output_dir, **kwargs):
        # simula EPUB parcial escrito no tmp antes da falha
        (Path(output_dir) / "partial.epub").write_bytes(b"meio arquivo")
        raise kcc.KccConversionFailedError("KCC morreu no meio")

    monkeypatch.setattr(kcc, "convert_comic", failing_convert)

    with pytest.raises(kcc.KccConversionFailedError):
        run_comic_export(42, out, slug="x", build_epub=True)

    export_dir = out / "comic_export"
    assert not (export_dir / "comic_export_manifest.json").exists()
    assert not list(export_dir.glob("*.epub")) if export_dir.exists() else True
    # tmp de staging limpo
    assert not list(export_dir.glob(".tmp-*")) if export_dir.exists() else True


def test_validate_export_artifact_rejects_outside_paths(tmp_path: Path) -> None:
    out = tmp_path / "42"
    export_dir = out / "comic_export"
    good = _fake_epub(export_dir / "ok.epub")
    evil = _fake_epub(tmp_path / "fora.epub")

    assert validate_export_artifact(out, str(good)) is not None
    assert validate_export_artifact(out, str(evil)) is None
    assert validate_export_artifact(out, str(export_dir / "inexistente.epub")) is None


# ---------------------------------------------------------------------------
# KCC: título e autor no comando
# ---------------------------------------------------------------------------

def test_convert_comic_passes_title_author(monkeypatch, tmp_path) -> None:
    """v1.2.2 — mocka run_external (novo layer) e verifica -t/-a no cmd."""
    import subprocess as _sp
    import app.services.kcc_service as kcc

    captured: dict = {}

    def fake_runner(cmd, **kwargs):
        captured["cmd"] = list(cmd)
        return _sp.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(kcc, "_check_kcc", lambda: None)
    monkeypatch.setattr(kcc, "run_external", fake_runner)
    (tmp_path / "livro.epub").write_bytes(b"x")

    kcc.convert_comic(
        tmp_path / "livro.cbz", tmp_path, title="Meu Título", author="Fulana"
    )
    cmd = captured["cmd"]
    assert "-t" in cmd and cmd[cmd.index("-t") + 1] == "Meu Título"
    assert "-a" in cmd and cmd[cmd.index("-a") + 1] == "Fulana"


def test_convert_comic_omits_title_author_by_default(monkeypatch, tmp_path) -> None:
    """v1.2.2 — sem título/autor, -t/-a não devem aparecer no cmd."""
    import subprocess as _sp
    import app.services.kcc_service as kcc

    captured: dict = {}
    monkeypatch.setattr(kcc, "_check_kcc", lambda: None)
    monkeypatch.setattr(
        kcc, "run_external",
        lambda cmd, **kw: captured.update(cmd=list(cmd))
        or _sp.CompletedProcess(args=cmd, returncode=0, stdout="", stderr=""),
    )
    (tmp_path / "livro.epub").write_bytes(b"x")

    kcc.convert_comic(tmp_path / "livro.cbz", tmp_path)
    assert "-t" not in captured["cmd"] and "-a" not in captured["cmd"]


# ---------------------------------------------------------------------------
# API + política de envio
# ---------------------------------------------------------------------------

def _make_db_job(test_engine, **kwargs):
    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob

    Session = sessionmaker(bind=test_engine)
    db = Session()
    job = ProcessingJob(original_filename=kwargs.pop("original_filename", "x.cbz"), **kwargs)
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()
    return job_id


def test_post_export_rejects_document_job(client, test_engine) -> None:
    job_id = _make_db_job(test_engine, processing_mode="document")
    r = client.post(f"/jobs/{job_id}/comic-export", json={})
    assert r.status_code == 409


def test_post_export_no_source_structured_409(client, test_engine, monkeypatch) -> None:
    import app.services.kcc_service as kcc
    monkeypatch.setattr(kcc, "_check_kcc", lambda: None)
    job_id = _make_db_job(test_engine, processing_mode="comic")
    r = client.post(f"/jobs/{job_id}/comic-export", json={})
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["code"] == "EXPORT_SOURCE_MISSING"
    assert detail["next_step"] == "finalize"


def test_send_translated_comic_without_export_blocks(client, test_engine, tmp_storage) -> None:
    """REGRA C: comic traduzido sem export final → 409, nunca envia original."""
    epub = tmp_storage / "output" / "kcc_original.epub"
    epub.parent.mkdir(parents=True, exist_ok=True)
    epub.write_bytes(b"epub do original")
    job_id = _make_db_job(
        test_engine,
        processing_mode="comic",
        comic_translation_status="done",
        conversion_status="done",
        epub_path=str(epub),
    )
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["code"] == "COMIC_EXPORT_REQUIRED"
    assert detail["next_step"] == "export"


def test_send_comic_with_visual_manifest_blocks(client, test_engine, tmp_storage) -> None:
    """REGRA D: sem tradução, mas com curadoria iniciada → exige export."""
    epub = tmp_storage / "output" / "kcc_original.epub"
    epub.parent.mkdir(parents=True, exist_ok=True)
    epub.write_bytes(b"epub do original")
    job_id = _make_db_job(
        test_engine,
        processing_mode="comic",
        conversion_status="done",
        epub_path=str(epub),
    )
    out_dir = tmp_storage / "output" / str(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "comic_final_manifest.json").write_text("{}")
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "COMIC_EXPORT_REQUIRED"


def test_send_comic_quick_path_allowed(client, test_engine, tmp_storage, monkeypatch) -> None:
    """REGRA B: comic sem tradução/pipeline → envia epub do KCC original."""
    import app.api.jobs as jobs_mod

    epub = tmp_storage / "output" / "kcc_original.epub"
    epub.parent.mkdir(parents=True, exist_ok=True)
    epub.write_bytes(b"epub do original")
    job_id = _make_db_job(
        test_engine,
        processing_mode="comic",
        conversion_status="done",
        epub_path=str(epub),
    )
    sent: dict = {}
    monkeypatch.setattr(jobs_mod, "is_smtp_reachable", lambda: True)
    monkeypatch.setattr(
        jobs_mod, "send_epub_to_kindle",
        lambda path, title: sent.update(path=str(path)),
    )
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 200
    assert sent["path"] == str(epub)


def test_send_translated_comic_uses_export_epub(client, test_engine, tmp_storage, monkeypatch) -> None:
    """REGRA C (sucesso): com export done, envia o EPUB do export final."""
    import app.api.jobs as jobs_mod

    job_id = _make_db_job(
        test_engine,
        processing_mode="comic",
        comic_translation_status="done",
        conversion_status="done",
    )
    out_dir = tmp_storage / "output" / str(job_id)
    export_epub = _fake_epub(out_dir / "comic_export" / "manga.epub")

    from sqlalchemy.orm import sessionmaker
    from app.models.processing_job import ProcessingJob
    Session = sessionmaker(bind=test_engine)
    db = Session()
    job = db.query(ProcessingJob).get(job_id)
    job.comic_export_status = "done"
    job.comic_export_path = str(export_epub)
    db.commit()
    db.close()

    sent: dict = {}
    monkeypatch.setattr(jobs_mod, "is_smtp_reachable", lambda: True)
    monkeypatch.setattr(
        jobs_mod, "send_epub_to_kindle",
        lambda path, title: sent.update(path=str(path)),
    )
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 200
    assert sent["path"] == str(export_epub)


def test_send_rejects_export_path_outside_job_dir(client, test_engine, tmp_storage, monkeypatch) -> None:
    """Path arbitrário salvo no banco não é aceito para envio."""
    evil = _fake_epub(tmp_storage / "fora" / "evil.epub")
    job_id = _make_db_job(
        test_engine,
        processing_mode="comic",
        comic_translation_status="done",
        comic_export_status="done",
        comic_export_path=str(evil),
    )
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "COMIC_EXPORT_REQUIRED"


def test_send_document_unchanged(client, test_engine) -> None:
    """REGRA A: documento sem conversão → 400 clássico."""
    job_id = _make_db_job(test_engine, processing_mode="document")
    r = client.post(f"/jobs/{job_id}/send")
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Migração de banco antigo
# ---------------------------------------------------------------------------

def test_migration_adds_columns_preserving_data(tmp_path, monkeypatch) -> None:
    import sqlite3

    db_file = tmp_path / "old.db"
    conn = sqlite3.connect(db_file)
    conn.execute(
        "CREATE TABLE processing_jobs ("
        "id INTEGER PRIMARY KEY, original_filename TEXT NOT NULL, status TEXT)"
    )
    conn.execute(
        "INSERT INTO processing_jobs (original_filename, status) VALUES ('velho.pdf', 'done')"
    )
    conn.commit()
    conn.close()

    import app.db.database as db_mod
    from sqlalchemy import create_engine

    old_engine = create_engine(f"sqlite:///{db_file}")
    monkeypatch.setattr(db_mod, "engine", old_engine)
    db_mod.init_db()
    old_engine.dispose()

    conn = sqlite3.connect(db_file)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(processing_jobs)")]
    for col in ("comic_export_status", "comic_export_path", "comic_export_source",
                "comic_export_error", "flow_mode", "active_operation"):
        assert col in cols, f"coluna {col} ausente após migração"
    row = conn.execute(
        "SELECT original_filename, status, comic_export_status, flow_mode "
        "FROM processing_jobs"
    ).fetchone()
    conn.close()
    assert row[0] == "velho.pdf" and row[1] == "done"
    assert row[2] == "not_started"
    assert row[3] == "advanced"
