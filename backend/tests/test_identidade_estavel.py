"""A identidade estável existe, é v4 de verdade, e não depende de ninguém lembrar.

Estes testes rodam as MIGRAÇÕES contra um banco vazio, e não montam as tabelas
pelo modelo. É a única forma honesta de provar um `server_default`: ele mora no
esquema do banco, e um teste que cria a tabela pelo SQLAlchemy prova o padrão do
Python — que é justamente o que NÃO cobria o caso que quebrou.

O caso que quebrou: a `c7d81e3a94b2` criou `pessoas.uuid` obrigatório com o
padrão declarado só no modelo. Todo `INSERT` por SQL cru passou a falhar com
`NOT NULL constraint failed`, e as cinquenta provas da interface caíram juntas
porque `scripts/sessao-de-prova.sh` insere direto. A `d8e92f4b05c3` põe o padrão
no banco.
"""

import re
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]

# 8-4-4-4-12, com a marca de versão (`4`) e a de variante (`8`, `9`, `a` ou `b`).
UUID_V4 = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


@pytest.fixture(scope="module")
def banco_migrado(tmp_path_factory):
    """Um banco vazio com todas as migrações aplicadas."""
    storage = tmp_path_factory.mktemp("storage-migrado")
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
        cwd=RAIZ,
        capture_output=True,
        text=True,
        env={
            "PATH": "/usr/bin:/bin",
            "MEKORA_STORAGE": str(storage),
            "HOME": str(tmp_path_factory.getbasetemp()),
        },
    )
    assert r.returncode == 0, r.stderr
    return storage / "kindle_tool.db"


def test_o_insert_cru_nao_precisa_saber_do_uuid(banco_migrado):
    """O ônus é do banco, e não de quem escreve o próximo script.

    Dois scripts inseriam direto quando isto quebrou — `_sessao.py` e
    `chave-local.py`. O terceiro é o que nasce depois e não vai lembrar.
    """
    c = sqlite3.connect(banco_migrado)
    try:
        c.execute(
            "INSERT INTO pessoas (email, criada_em) VALUES ('a@exemplo.com', datetime('now'))"
        )
        c.commit()
        uuid = c.execute("SELECT uuid FROM pessoas WHERE email='a@exemplo.com'").fetchone()[0]
    finally:
        c.close()
    assert uuid, "o INSERT cru passou e deixou o uuid vazio"


def test_o_uuid_gerado_pelo_banco_e_v4_de_verdade(banco_migrado):
    """E não hexadecimal solto.

    `lower(hex(randomblob(16)))` daria 32 dígitos sem hífens, e o produto teria
    duas grafias de uuid — a das linhas antigas e a das novas.
    """
    c = sqlite3.connect(banco_migrado)
    try:
        for i in range(20):
            c.execute(
                "INSERT INTO pessoas (email, criada_em) VALUES (?, datetime('now'))",
                (f"v4-{i}@exemplo.com",),
            )
        c.commit()
        uuids = [
            r[0]
            for r in c.execute("SELECT uuid FROM pessoas WHERE email LIKE 'v4-%@exemplo.com'")
        ]
    finally:
        c.close()

    assert len(uuids) == 20
    for u in uuids:
        assert UUID_V4.match(u), f"{u!r} não é um uuid v4"


def test_o_uuid_e_unico(banco_migrado):
    """Um identificador estável repetido é pior que nenhum: parece resolver, e
    junta duas pessoas em silêncio."""
    c = sqlite3.connect(banco_migrado)
    try:
        for i in range(50):
            c.execute(
                "INSERT INTO pessoas (email, criada_em) VALUES (?, datetime('now'))",
                (f"unico-{i}@exemplo.com",),
            )
        c.commit()
        total, distintos = c.execute("SELECT count(*), count(DISTINCT uuid) FROM pessoas").fetchone()
    finally:
        c.close()
    assert total == distintos, "dois uuids iguais no mesmo banco"


def test_a_coluna_e_obrigatoria(banco_migrado):
    """Anulável a coluna seria decorativa: metade das linhas sem identidade
    estável não é identidade estável."""
    c = sqlite3.connect(banco_migrado)
    try:
        coluna = [r for r in c.execute("PRAGMA table_info(pessoas)") if r[1] == "uuid"]
        assert coluna, "a coluna `uuid` não existe"
        assert coluna[0][3] == 1, "`pessoas.uuid` aceita NULL"
    finally:
        c.close()


def test_uuid_vazio_explicito_e_recusado(banco_migrado):
    """O padrão cobre a omissão, e a unicidade cobre o resto.

    Passar string vazia de propósito não é o caso que o padrão resolve — mas a
    segunda tentativa tem de bater na unicidade, senão duas linhas ficariam com
    a mesma identidade vazia.
    """
    c = sqlite3.connect(banco_migrado)
    try:
        c.execute(
            "INSERT INTO pessoas (email, uuid, criada_em) VALUES (?, '', datetime('now'))",
            ("vazio-1@exemplo.com",),
        )
        c.commit()
        with pytest.raises(sqlite3.IntegrityError):
            c.execute(
                "INSERT INTO pessoas (email, uuid, criada_em) VALUES (?, '', datetime('now'))",
                ("vazio-2@exemplo.com",),
            )
            c.commit()
    finally:
        c.rollback()
        c.close()
