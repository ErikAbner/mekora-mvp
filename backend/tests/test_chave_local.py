from __future__ import annotations

import hashlib
import os
import sqlite3
import subprocess
import sys
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[2]


def test_chave_local_usa_storage_do_container(tmp_path: Path) -> None:
    banco = tmp_path / "kindle_tool.db"
    conexao = sqlite3.connect(banco)
    conexao.executescript(
        """
        CREATE TABLE pessoas (
            id INTEGER PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            criada_em DATETIME NOT NULL,
            vista_em DATETIME
        );
        CREATE TABLE chaves (
            id INTEGER PRIMARY KEY,
            pessoa_id INTEGER NOT NULL REFERENCES pessoas(id),
            resumo TEXT NOT NULL UNIQUE,
            criada_em DATETIME NOT NULL,
            expira_em DATETIME NOT NULL,
            usada_em DATETIME
        );
        """
    )
    conexao.close()

    email = "windows@mekora.local"
    resultado = subprocess.run(
        [sys.executable, str(RAIZ / "scripts" / "chave-local.py")],
        cwd=RAIZ,
        env={**os.environ, "MEKORA_STORAGE": str(tmp_path), "MEKORA_EMAIL": email},
        check=True,
        capture_output=True,
        text=True,
    )
    token = resultado.stdout.strip()
    assert len(token) >= 20

    conexao = sqlite3.connect(banco)
    pessoa = conexao.execute("SELECT email FROM pessoas").fetchone()
    chave = conexao.execute("SELECT resumo FROM chaves").fetchone()
    conexao.close()

    assert pessoa == (email,)
    assert chave == (hashlib.sha256(token.encode("utf-8")).hexdigest(),)

