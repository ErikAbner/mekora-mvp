from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def test_html_da_interface_nao_fica_preso_no_cache(client):
    resposta = client.get("/uma-rota-da-interface")

    assert resposta.status_code == 200
    assert resposta.headers["cache-control"] == "no-store, max-age=0"


def test_assinatura_da_interface_muda_com_o_conteudo(tmp_path: Path):
    raiz = tmp_path
    (raiz / "web" / "src").mkdir(parents=True)
    (raiz / "web" / "tokens").mkdir()
    (raiz / "web" / "publico").mkdir()
    fonte = raiz / "web" / "src" / "tela.jsx"
    fonte.write_text("export const tela = 1;\n", encoding="utf-8")

    script = Path(__file__).resolve().parents[2] / "scripts" / "fingerprint-interface.py"

    def ler() -> str:
        return subprocess.check_output(
            [sys.executable, str(script), str(raiz)],
            text=True,
        ).strip()

    primeira = ler()
    fonte.write_text("export const tela = 2;\n", encoding="utf-8")
    segunda = ler()

    assert len(primeira) == 64
    assert primeira != segunda
