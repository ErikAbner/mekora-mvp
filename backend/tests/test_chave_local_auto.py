import hashlib
import os
import sqlite3
import subprocess
import sys
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[2]


def _banco(tmp_path: Path, *, donos: tuple[int, ...]) -> Path:
    storage = tmp_path / "storage"
    storage.mkdir()
    banco = storage / "kindle_tool.db"
    c = sqlite3.connect(banco)
    c.executescript(
        """
        CREATE TABLE pessoas (
          id INTEGER PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          criada_em DATETIME
        );
        CREATE TABLE processing_jobs (
          id INTEGER PRIMARY KEY,
          dono_id INTEGER
        );
        CREATE TABLE chaves (
          id INTEGER PRIMARY KEY,
          pessoa_id INTEGER NOT NULL,
          resumo TEXT NOT NULL,
          criada_em DATETIME NOT NULL,
          expira_em DATETIME NOT NULL
        );
        INSERT INTO pessoas(id, email) VALUES (3, 'dona@exemplo.com');
        INSERT INTO pessoas(id, email) VALUES (4, 'outra@exemplo.com');
        """
    )
    for indice, dono in enumerate(donos, 1):
        c.execute("INSERT INTO processing_jobs(id, dono_id) VALUES (?, ?)", (indice, dono))
    c.commit()
    c.close()
    return banco


def _executar(tmp_path: Path) -> subprocess.CompletedProcess[str]:
    ambiente = os.environ.copy()
    ambiente.update({"MEKORA_PROVA": str(tmp_path), "MEKORA_EMAIL": "auto"})
    return subprocess.run(
        [sys.executable, str(RAIZ / "scripts/chave-local.py")],
        capture_output=True,
        text=True,
        env=ambiente,
    )


def test_auto_entra_como_a_unica_conta_que_possui_livros(tmp_path):
    banco = _banco(tmp_path, donos=(3, 3))

    resultado = _executar(tmp_path)

    assert resultado.returncode == 0, resultado.stderr
    token = resultado.stdout.strip()
    assert token
    resumo = hashlib.sha256(token.encode()).hexdigest()
    c = sqlite3.connect(banco)
    try:
        assert c.execute(
            "SELECT pessoa_id FROM chaves WHERE resumo = ?", (resumo,)
        ).fetchone() == (3,)
    finally:
        c.close()


def test_auto_nao_escolhe_em_silencio_entre_duas_contas(tmp_path):
    banco = _banco(tmp_path, donos=(3, 4))

    resultado = _executar(tmp_path)

    assert resultado.returncode == 3
    c = sqlite3.connect(banco)
    try:
        assert c.execute("SELECT count(*) FROM chaves").fetchone() == (0,)
    finally:
        c.close()


def test_iniciador_de_tablet_nao_inventa_conta_vazia():
    iniciador = (RAIZ / "scripts/iniciar-local.sh").read_text()

    assert 'MEKORA_EMAIL="${MEKORA_EMAIL:-auto}"' in iniciador
    assert 'MEKORA_EMAIL="${MEKORA_EMAIL:-mekora@local}"' not in iniciador
