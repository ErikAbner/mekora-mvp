"""
Testes para kcc_service — Fase A.
subprocess.run é mockado para que os testes não dependam de kcc-c2e instalado.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.services.kcc_service import (
    KccConversionFailedError,
    KccNotInstalledError,
    _check_kcc,
    _find_kcc_executable,
    convert_comic,
    get_kcc_status,
)


# ---------------------------------------------------------------------------
# _check_kcc
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# _find_kcc_executable
# ---------------------------------------------------------------------------

def test_find_kcc_executable_prefers_venv_bin(tmp_path, monkeypatch) -> None:
    """_find_kcc_executable retorna o executável do venv quando existe."""
    import sys
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_kcc = fake_bin / "kcc-c2e"
    fake_kcc.touch()
    monkeypatch.setattr(sys, "executable", str(fake_bin / "python"))
    result = _find_kcc_executable()
    assert result == str(fake_kcc)


def test_find_kcc_executable_falls_back_to_project_venv(tmp_path, monkeypatch) -> None:
    """_find_kcc_executable usa .venv/bin da raiz do projeto quando sys.executable
    não aponta para o venv (backend iniciado sem activate)."""
    import sys
    import app.services.kcc_service as svc

    # sys.executable aponta para um Python fora do venv — sem kcc-c2e no bin
    fake_sys_bin = tmp_path / "sys_bin"
    fake_sys_bin.mkdir()
    monkeypatch.setattr(sys, "executable", str(fake_sys_bin / "python3"))

    # Cria .venv/bin/kcc-c2e relativo ao tmp_path (simula raiz do projeto)
    project_venv_bin = tmp_path / ".venv" / "bin"
    project_venv_bin.mkdir(parents=True)
    fake_kcc = project_venv_bin / "kcc-c2e"
    fake_kcc.touch()

    # Faz Path(__file__).resolve().parents[3] apontar para tmp_path
    fake_kcc_service_path = tmp_path / "backend" / "app" / "services" / "kcc_service.py"
    fake_kcc_service_path.parent.mkdir(parents=True)
    monkeypatch.setattr(svc, "__file__", str(fake_kcc_service_path))

    result = _find_kcc_executable()
    assert result == str(fake_kcc)


def test_find_kcc_executable_falls_back_to_shutil_which(tmp_path, monkeypatch) -> None:
    """_find_kcc_executable usa shutil.which quando não está no venv/bin nem no .venv do projeto."""
    import sys
    import shutil
    import app.services.kcc_service as svc

    # sys.executable aponta para um bin/ sem kcc-c2e
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    monkeypatch.setattr(sys, "executable", str(fake_bin / "python"))

    # __file__ aponta para um diretório de projeto fictício sem .venv/bin/kcc-c2e
    fake_kcc_service_path = tmp_path / "backend" / "app" / "services" / "kcc_service.py"
    fake_kcc_service_path.parent.mkdir(parents=True)
    monkeypatch.setattr(svc, "__file__", str(fake_kcc_service_path))

    # Simula shutil.which encontrando o executável no PATH do sistema
    monkeypatch.setattr(shutil, "which", lambda name, path=None: "/usr/local/bin/kcc-c2e" if name == "kcc-c2e" else None)
    result = _find_kcc_executable()
    assert result == "/usr/local/bin/kcc-c2e"


# ---------------------------------------------------------------------------
# get_kcc_status
# ---------------------------------------------------------------------------

def test_get_kcc_status_available(monkeypatch) -> None:
    """get_kcc_status retorna available=True quando kcc-c2e funciona."""
    mock_result = MagicMock()
    mock_result.returncode = 0
    monkeypatch.setattr("subprocess.run", lambda *a, **kw: mock_result)
    status = get_kcc_status()
    assert status["available"] is True
    assert status["path"] is not None


def test_get_kcc_status_unavailable_file_not_found(monkeypatch) -> None:
    """get_kcc_status retorna available=False quando kcc-c2e não existe no PATH."""
    def raise_fnf(*a, **kw):
        raise FileNotFoundError
    monkeypatch.setattr("subprocess.run", raise_fnf)
    status = get_kcc_status()
    assert status["available"] is False
    assert status["path"] is None


# ---------------------------------------------------------------------------
# _check_kcc
# ---------------------------------------------------------------------------

def test_check_kcc_ok(monkeypatch) -> None:
    """kcc-c2e acessível → não levanta exceção."""
    mock_result = MagicMock()
    mock_result.returncode = 0
    monkeypatch.setattr("subprocess.run", lambda *a, **kw: mock_result)
    _check_kcc()  # não deve levantar


def test_check_kcc_not_installed(monkeypatch) -> None:
    """kcc-c2e ausente (returncode != 0) → KccNotInstalledError."""
    mock_result = MagicMock()
    mock_result.returncode = 1
    monkeypatch.setattr("subprocess.run", lambda *a, **kw: mock_result)
    with pytest.raises(KccNotInstalledError):
        _check_kcc()


def test_check_kcc_uses_help_flag(monkeypatch) -> None:
    """_check_kcc deve usar '-h', não '--version' (kcc v9+ não tem --version)."""
    captured = []

    def fake_run(cmd, **kw):
        captured.append(cmd)
        r = MagicMock()
        r.returncode = 0
        return r

    monkeypatch.setattr("subprocess.run", fake_run)
    _check_kcc()
    # O executável pode ser um caminho absoluto; o importante é terminar em kcc-c2e e usar -h
    assert captured[0][-1] == '-h'
    assert captured[0][0].endswith('kcc-c2e')


def test_check_kcc_file_not_found(monkeypatch) -> None:
    """kcc-c2e não está no PATH (FileNotFoundError) → KccNotInstalledError, não 500."""
    import app.services.kcc_service as svc
    # Força _find_kcc_executable a retornar um executável inexistente
    monkeypatch.setattr(svc, "_find_kcc_executable", lambda: "nonexistent-kcc-c2e")

    def raise_fnf(*a, **kw):
        raise FileNotFoundError("[Errno 2] No such file or directory: 'nonexistent-kcc-c2e'")
    monkeypatch.setattr("subprocess.run", raise_fnf)
    with pytest.raises(KccNotInstalledError):
        _check_kcc()


def test_convert_comic_file_not_found_during_conversion(tmp_path, monkeypatch) -> None:
    """FileNotFoundError durante a conversão → KccNotInstalledError com mensagem útil."""
    import app.services.kcc_service as svc
    input_file = tmp_path / "manga.cbz"
    input_file.touch()
    # Força _find_kcc_executable a retornar um executável inexistente para testar o fallback
    monkeypatch.setattr(svc, "_find_kcc_executable", lambda: "nonexistent-kcc-c2e")

    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # _check_kcc ok
            r = MagicMock()
            r.returncode = 0
            return r
        # conversão lança FileNotFoundError
        raise FileNotFoundError("[Errno 2] No such file or directory: 'nonexistent-kcc-c2e'")

    monkeypatch.setattr("subprocess.run", fake_run)
    with pytest.raises(KccNotInstalledError):
        convert_comic(input_file, tmp_path / "out")


# ---------------------------------------------------------------------------
# convert_comic — sucesso
# ---------------------------------------------------------------------------

def _make_version_ok():
    r = MagicMock()
    r.returncode = 0
    return r


def test_convert_comic_returns_epub(tmp_path, monkeypatch) -> None:
    """Conversão bem-sucedida retorna o Path do EPUB gerado."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count == 1:
            # _check_kcc call
            return result
        # actual conversion call — create the expected output file
        output_dir = Path(cmd[cmd.index('--output') + 1])
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "manga.epub").touch()
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    output_dir = tmp_path / "out"
    result = convert_comic(input_file, output_dir)
    assert result.suffix == ".epub"
    assert result.exists()


def test_convert_comic_manga_mode_flag(tmp_path, monkeypatch) -> None:
    """manga_mode=True adiciona --manga-style ao comando."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    captured_cmds: list[list[str]] = []
    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        captured_cmds.append(cmd)
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count >= 2:
            output_dir = Path(cmd[cmd.index('--output') + 1])
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "manga.epub").touch()
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    convert_comic(input_file, tmp_path / "out", manga_mode=True)
    kcc_cmd = captured_cmds[-1]
    assert "--manga-style" in kcc_cmd


def test_convert_comic_rtl_flag(tmp_path, monkeypatch) -> None:
    """rtl=True adiciona --manga-style ao comando (kcc v9+: RTL incluso em manga-style)."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    captured_cmds: list[list[str]] = []
    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        captured_cmds.append(cmd)
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count >= 2:
            output_dir = Path(cmd[cmd.index('--output') + 1])
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "manga.epub").touch()
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    convert_comic(input_file, tmp_path / "out", rtl=True)
    kcc_cmd = captured_cmds[-1]
    assert "--manga-style" in kcc_cmd
    assert "--right-left" not in kcc_cmd


def test_convert_comic_no_extra_flags_by_default(tmp_path, monkeypatch) -> None:
    """Sem manga_mode e rtl, nenhuma flag extra deve estar no comando."""
    input_file = tmp_path / "comic.cbz"
    input_file.touch()

    captured_cmds: list[list[str]] = []
    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        captured_cmds.append(cmd)
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count >= 2:
            output_dir = Path(cmd[cmd.index('--output') + 1])
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "comic.epub").touch()
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    convert_comic(input_file, tmp_path / "out")
    kcc_cmd = captured_cmds[-1]
    assert "--manga-style" not in kcc_cmd
    assert "--right-left" not in kcc_cmd
    assert "--quality" not in kcc_cmd


# ---------------------------------------------------------------------------
# convert_comic — falhas
# ---------------------------------------------------------------------------

def test_convert_comic_kcc_conversion_error(tmp_path, monkeypatch) -> None:
    """KCC retorna returncode != 0 → KccConversionFailedError."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        if call_count == 1:
            result.returncode = 0  # _check_kcc ok
        else:
            result.returncode = 1  # conversão falhou
            result.stderr = "erro de conversão simulado"
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    with pytest.raises(KccConversionFailedError, match="KCC falhou"):
        convert_comic(input_file, tmp_path / "out")


def test_convert_comic_no_epub_generated(tmp_path, monkeypatch) -> None:
    """KCC retorna 0 mas não gera nenhum EPUB → KccConversionFailedError."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count >= 2:
            # cria o diretório mas não gera EPUB
            output_dir = Path(cmd[cmd.index('--output') + 1])
            output_dir.mkdir(parents=True, exist_ok=True)
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    with pytest.raises(KccConversionFailedError, match="não gerou"):
        convert_comic(input_file, tmp_path / "out")


def test_convert_comic_finds_epub_with_suffix(tmp_path, monkeypatch) -> None:
    """KCC gera EPUB com sufixo diferente do stem — deve ser encontrado pela busca glob."""
    input_file = tmp_path / "manga.cbz"
    input_file.touch()

    call_count = 0

    def fake_run(cmd, **kw):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        if call_count >= 2:
            output_dir = Path(cmd[cmd.index('--output') + 1])
            output_dir.mkdir(parents=True, exist_ok=True)
            # KCC às vezes adiciona sufixo ao nome
            (output_dir / "manga_KPW5.epub").touch()
        return result

    monkeypatch.setattr("subprocess.run", fake_run)

    result = convert_comic(input_file, tmp_path / "out")
    assert result.suffix == ".epub"
