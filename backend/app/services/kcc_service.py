"""Integração com Kindle Comic Converter (kcc-c2e CLI) — Fase A.

v1.2.2 — subprocess de conversão migrado para `subprocess_runner.run_external`
(timeout, captura limitada, mensagens redigidas).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP
from app.core.limits import limits
from app.services.subprocess_runner import ExternalToolError, run_external

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


# Quanto se espera por um `-h`, que deve responder em milissegundos.
_ESPERA_DA_CHECAGEM = 10


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
        # TIMEOUT NUMA CHECAGEM DE PRESENÇA, e ele não estava aqui.
        #
        # `-h` deve responder em milissegundos, e é exatamente por isso que
        # esperar por ele para sempre é o pior caso: um binário travado — disco
        # de rede, dependência quebrada, processo zumbi — pendurava a REQUISIÇÃO
        # que só queria saber se o KCC existe. Sem limite, sem erro, sem log.
        result = subprocess.run([exe, '-h'], capture_output=True, timeout=_ESPERA_DA_CHECAGEM)
        available = result.returncode == 0
    except subprocess.TimeoutExpired:
        # Um binário que não responde a `-h` não está utilizável, e dizer
        # "indisponível" é mais verdadeiro que esperar.
        available = False
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
        result = subprocess.run([exe, '-h'], capture_output=True, timeout=_ESPERA_DA_CHECAGEM)
    except subprocess.TimeoutExpired:
        raise KccNotInstalledError(
            f"kcc-c2e não respondeu em {_ESPERA_DA_CHECAGEM}s — o binário existe "
            "mas não está utilizável."
        )
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
        run_external(
            cmd,
            timeout_seconds=limits.kcc_timeout_seconds,
            tool_label="KCC",
            input_path=input_path,
            allowed_roots=(STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP),
        )
    except ExternalToolError as exc:
        if exc.code == "TOOL_NOT_FOUND":
            raise KccNotInstalledError(
                "kcc-c2e não encontrado ao tentar converter. "
                "Instale com: pip install git+https://github.com/ciromattia/kcc.git"
            )
        # Preserva a interface do serviço; mensagem já vem curta e sem paths
        raise KccConversionFailedError(exc.public_message)

    # KCC pode adicionar sufixo ao nome — buscar o EPUB gerado
    stem = input_path.stem
    epub_out = output_dir / f"{stem}.epub"
    if not epub_out.exists():
        candidates = list(output_dir.glob("*.epub"))
        if not candidates:
            raise KccConversionFailedError("KCC não gerou nenhum EPUB.")
        epub_out = candidates[0]

    return epub_out
