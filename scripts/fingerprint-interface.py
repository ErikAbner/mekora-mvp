#!/usr/bin/env python3
"""Imprime a assinatura do código que produz a interface do Mekora.

Datas de modificação não são uma fonte confiável depois de pull, checkout ou
restauração de backup. A assinatura olha o conteúdo; se qualquer fonte mudar,
o iniciador sabe que precisa reconstruir o aplicativo instalado.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path


ARQUIVOS = ("index.html", "vite.config.js", "package.json", "package-lock.json")
PASTAS = ("src", "tokens", "publico")


def assinatura(raiz: Path) -> str:
    web = raiz / "web"
    caminhos = [web / nome for nome in ARQUIVOS]
    for pasta in PASTAS:
        base = web / pasta
        if base.exists():
            caminhos.extend(p for p in base.rglob("*") if p.is_file())

    digest = hashlib.sha256()
    for caminho in sorted(caminhos, key=lambda p: p.as_posix()):
        if not caminho.is_file():
            continue
        relativo = caminho.relative_to(raiz).as_posix().encode("utf-8")
        digest.update(len(relativo).to_bytes(4, "big"))
        digest.update(relativo)
        conteudo = caminho.read_bytes()
        digest.update(len(conteudo).to_bytes(8, "big"))
        digest.update(conteudo)
    return digest.hexdigest()


if __name__ == "__main__":
    raiz = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    print(assinatura(raiz))
