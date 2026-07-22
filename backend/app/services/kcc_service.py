"""Integração com Kindle Comic Converter (kcc-c2e CLI) — Fase A."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

KCC_PROFILES: dict[str, str] = {
    'KV':   'Kindle Voyage / PW 3 (1448×1072)',
    'KO':   'Kindle Oasis (1264×954)',
    'KPW5': 'Kindle PW 5/6/7 (1648×1236)',
    'KOBO': 'Kobo (1448×1072)',
}


class KccNotInstalledError(Exception):
    """kcc-c2e não encontrado no PATH nem no bin/ do venv atual."""


class KccConversionFailedError(Exception):
    """kcc-c2e terminou com erro durante a conversão."""


def _find_kcc_executable() -> str:
    """
    Localiza o executável kcc-c2e.

    Estratégia (em ordem de prioridade):
    1. bin/ do mesmo Python em execução (venv ativo via uvicorn ou pytest)
    2. .venv/bin/ na raiz do projeto (cobre backend iniciado sem activate)
    3. PATH ambiente enriquecido com bin/ do venv
    4. Fallback literal 'kcc-c2e' (para testes com monkeypatch)

    Retorna o caminho absoluto quando encontrado.
    """
    venv_bin = Path(sys.executable).parent
    candidate = venv_bin / 'kcc-c2e'
    if candidate.exists():
        return str(candidate)
    # Fallback: .venv/bin na raiz do projeto — cobre o caso em que o backend é
    # iniciado sem "source .venv/bin/activate" (sys.executable aponta para o
    # Python do sistema, não do venv).
    project_root = Path(__file__).resolve().parents[3]
    project_venv_kcc = project_root / '.venv' / 'bin' / 'kcc-c2e'
    if project_venv_kcc.exists():
        return str(project_venv_kcc)
    # Inclui venv/bin no PATH de busca para cobrir ambientes sem activate
    search_path = str(venv_bin) + os.pathsep + os.environ.get('PATH', '')
    found = shutil.which('kcc-c2e', path=search_path)
    return found if found else 'kcc-c2e'


def get_kcc_status() -> dict:
    """
    Retorna o status de disponibilidade do kcc-c2e.

    Returns:
        {"available": bool, "path": str | None}
    """
    exe = _find_kcc_executable()
    try:
        result = subprocess.run([exe, '-h'], capture_output=True)
        available = result.returncode == 0
    except FileNotFoundError:
        available = False
    return {
        "available": available,
        "path": exe if available else None,
    }


def _check_kcc() -> None:
    """Verifica se kcc-c2e está disponível.

    Raises:
        KccNotInstalledError: se o binário não for encontrado ou falhar.
    """
    exe = _find_kcc_executable()
    try:
        result = subprocess.run([exe, '-h'], capture_output=True)
    except FileNotFoundError:
        raise KccNotInstalledError(
            "kcc-c2e não encontrado. Instale com: "
            "pip install git+https://github.com/ciromattia/kcc.git"
        )
    if result.returncode != 0:
        raise KccNotInstalledError(
            "kcc-c2e instalado mas falhou ao iniciar. Verifique a instalação."
        )


def convert_comic(
    input_path: Path,
    output_dir: Path,
    profile: str = 'KPW5',
    manga_mode: bool = False,
    rtl: bool = False,
    *,
    title: str | None = None,
    author: str | None = None,
) -> Path:
    """Converte um arquivo de quadrinhos/mangá via KCC.

    Args:
        input_path: Caminho do arquivo de entrada (CBZ, CBR, CB7, CBC ou PDF).
        output_dir:  Diretório onde o EPUB será gerado.
        profile:     Perfil de dispositivo KCC (padrão: KPW5).
        manga_mode:  Ativa otimizações para mangá (--manga-style).
        rtl:         Modo da direita para a esquerda (v9+: incluso em --manga-style).
        title:       Título a embutir nos metadados do EPUB (-t).
        author:      Autor a embutir nos metadados do EPUB (-a).

    Returns:
        Path do EPUB gerado.

    Raises:
        KccNotInstalledError: se kcc-c2e não estiver disponível.
        KccConversionFailedError: se a conversão falhar.
    """
    _check_kcc()
    exe = _find_kcc_executable()
    output_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        exe,
        str(input_path),
        '--output', str(output_dir),
        '--profile', profile,
        '--format', 'EPUB',
    ]
    # --manga-style cobre tanto modo mangá quanto leitura RTL (kcc v9+)
    if manga_mode or rtl:
        cmd.append('--manga-style')
    if title:
        cmd.extend(['-t', title])
    if author:
        cmd.extend(['-a', author])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError:
        raise KccNotInstalledError(
            "kcc-c2e não encontrado ao tentar converter. "
            "Instale com: pip install git+https://github.com/ciromattia/kcc.git"
        )
    if result.returncode != 0:
        # KCC writes errors to stdout; fall back to stderr if stdout is empty
        output = (result.stdout.strip() or result.stderr.strip())[:400]
        raise KccConversionFailedError(
            f"KCC falhou ao processar o arquivo (código {result.returncode})"
            + (f": {output}" if output else "")
        )

    # KCC pode adicionar sufixo ao nome — buscar o EPUB gerado
    stem = input_path.stem
    epub_out = output_dir / f"{stem}.epub"
    if not epub_out.exists():
        candidates = list(output_dir.glob("*.epub"))
        if not candidates:
            raise KccConversionFailedError("KCC não gerou nenhum EPUB.")
        epub_out = candidates[0]

    return epub_out
