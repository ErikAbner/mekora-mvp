from __future__ import annotations

from pathlib import Path


RAIZ = Path(__file__).resolve().parents[2]


def test_entrega_windows_tem_entradas_e_configuracao_isolada() -> None:
    iniciar = RAIZ / "Iniciar Mekora.cmd"
    parar = RAIZ / "Parar Mekora.cmd"
    powershell = RAIZ / "scripts" / "iniciar-windows.ps1"
    compose = RAIZ / "docker-compose.windows.yml"

    assert iniciar.is_file()
    assert parar.is_file()
    assert powershell.is_file()
    assert compose.is_file()

    texto = powershell.read_text(encoding="utf-8")
    assert "docker compose version" in texto
    assert "MEKORA_ENV_FILE = '.env.windows'" in texto
    assert "python3 /app/scripts/chave-local.py" in texto
    assert "Invoke-WebRequest" in texto

    configuracao = compose.read_text(encoding="utf-8")
    assert "http://localhost:${MEKORA_PORTA_LOCAL:-8080}" in configuracao
    assert "${MEKORA_BIND_ADDRESS:-127.0.0.1}:${MEKORA_PORTA_LOCAL:-8080}" in configuracao
    assert "-Tablet" in texto
    assert "MEKORA_BIND_ADDRESS = $BindAddress" in texto


def test_scripts_unix_mantem_lf_no_clone_do_windows() -> None:
    atributos = (RAIZ / ".gitattributes").read_text(encoding="utf-8")
    assert "*.sh text eol=lf" in atributos
    assert "*.py text eol=lf" in atributos
    assert "*.cmd text eol=crlf" in atributos
    assert "*.ps1 text eol=crlf" in atributos
