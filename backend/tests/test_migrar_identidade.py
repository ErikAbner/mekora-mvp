"""O controle negativo da migração de identidade — item `C10`.

Um script de migração que só foi testado no caminho feliz é um script que
ninguém sabe se para quando deve parar. E aqui o "deveria parar" é a parte
inteira do valor: o princípio é *nunca inferir silenciosamente o proprietário
quando houver ambiguidade*, e um script que não sabe reconhecer ambiguidade
cumpre o princípio por sorte.

A BANCADA PRECISA SABER PRODUZIR O CASO. O legado real tem 37 trabalhos órfãos e
NENHUM com sinal do grafo — nele, a detecção de ambiguidade nunca dispararia, e
rodar lá provaria só que o caminho fácil funciona. Então cada teste aqui monta o
banco no estado que ele quer medir.
"""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ / "scripts" / "migrar-identidade.py"

ESQUEMA = """
CREATE TABLE pessoas (
  id INTEGER PRIMARY KEY, email VARCHAR NOT NULL UNIQUE, uuid VARCHAR(36) NOT NULL UNIQUE
);
CREATE TABLE processing_jobs (
  id INTEGER PRIMARY KEY, dono_id INTEGER,
  FOREIGN KEY(dono_id) REFERENCES pessoas(id) ON DELETE SET NULL
);
CREATE TABLE notas (
  id INTEGER PRIMARY KEY, pessoa_id INTEGER NOT NULL, job_id INTEGER,
  FOREIGN KEY(pessoa_id) REFERENCES pessoas(id), FOREIGN KEY(job_id) REFERENCES processing_jobs(id)
);
CREATE TABLE progressos (
  id INTEGER PRIMARY KEY, pessoa_id INTEGER NOT NULL, job_id INTEGER,
  FOREIGN KEY(pessoa_id) REFERENCES pessoas(id), FOREIGN KEY(job_id) REFERENCES processing_jobs(id)
);
CREATE TABLE marcadores (
  id INTEGER PRIMARY KEY, pessoa_id INTEGER NOT NULL, job_id INTEGER,
  FOREIGN KEY(pessoa_id) REFERENCES pessoas(id), FOREIGN KEY(job_id) REFERENCES processing_jobs(id)
);
CREATE TABLE canvas_livros (
  id INTEGER PRIMARY KEY, pessoa_id INTEGER NOT NULL, job_id INTEGER,
  FOREIGN KEY(pessoa_id) REFERENCES pessoas(id), FOREIGN KEY(job_id) REFERENCES processing_jobs(id)
);
CREATE TABLE recados (id INTEGER PRIMARY KEY, pessoa_id INTEGER, email VARCHAR);
"""


def montar(tmp_path, *, jobs_orfaos=3, notas=(), recados_anonimos=1, pessoas=2, com_uuid=True):
    """Monta um storage com o banco no estado pedido.

    `notas` é uma lista de `(job_id, pessoa_id)` — é ela que produz o sinal do
    grafo, e portanto a ambiguidade.
    """
    storage = tmp_path / "storage"
    storage.mkdir(parents=True, exist_ok=True)
    banco = storage / "kindle_tool.db"
    c = sqlite3.connect(banco)
    c.executescript(ESQUEMA)
    for i in range(1, pessoas + 1):
        c.execute(
            "INSERT INTO pessoas (id, email, uuid) VALUES (?, ?, ?)",
            (i, f"pessoa{i}@exemplo.com", f"0000000{i}-0000-4000-8000-000000000000"),
        )
    for j in range(1, jobs_orfaos + 1):
        c.execute("INSERT INTO processing_jobs (id, dono_id) VALUES (?, NULL)", (j,))
    for k, (job, pessoa) in enumerate(notas, start=1):
        c.execute("INSERT INTO notas (id, pessoa_id, job_id) VALUES (?, ?, ?)", (k, pessoa, job))
    for k in range(1, recados_anonimos + 1):
        c.execute("INSERT INTO recados (id, pessoa_id, email) VALUES (?, NULL, NULL)", (k,))
    if not com_uuid:
        c.executescript(
            "ALTER TABLE pessoas RENAME TO p2;"
            "CREATE TABLE pessoas (id INTEGER PRIMARY KEY, email VARCHAR NOT NULL UNIQUE);"
            "INSERT INTO pessoas (id, email) SELECT id, email FROM p2;"
            "DROP TABLE p2;"
        )
    c.commit()
    c.close()
    return storage


def rodar(storage, *args):
    env = {**os.environ, "MEKORA_STORAGE": str(storage), "NO_COLOR": "1"}
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], capture_output=True, text=True, env=env
    )


def donos(storage):
    c = sqlite3.connect(storage / "kindle_tool.db")
    try:
        return [r[0] for r in c.execute("SELECT dono_id FROM processing_jobs ORDER BY id")]
    finally:
        c.close()


# ── o ensaio, que é o padrão ────────────────────────────────────────────────

def test_sem_executar_nao_grava_nada(tmp_path):
    """2 · DRY-RUN, e ele é o PADRÃO.

    Um script destrutivo cujo padrão é executar depende de alguém lembrar da
    flag. O padrão certo é o que não estraga quando a pessoa esquece.
    """
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com")
    assert r.returncode == 0, r.stderr
    assert "ENSAIO" in r.stdout
    assert donos(storage) == [None, None, None], "o ensaio gravou"


def test_o_inventario_nao_grava_e_nao_precisa_de_destino(tmp_path):
    storage = montar(tmp_path)
    r = rodar(storage, "--inventario")
    assert r.returncode == 0, r.stderr
    assert "sem dono: 3 trabalho(s)" in r.stdout
    assert donos(storage) == [None, None, None]


# ── 3 · a identidade destino é informada, e nunca escolhida ──────────────────

def test_sem_destino_nao_migra_e_diz_como(tmp_path):
    storage = montar(tmp_path)
    r = rodar(storage)
    assert r.returncode == 0
    assert "--destino" in r.stdout
    assert donos(storage) == [None, None, None]


def test_destino_que_nao_existe_reprova(tmp_path):
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "ninguem@exemplo.com", "--executar")
    assert r.returncode == 1
    assert "não achei pessoa" in r.stderr
    assert donos(storage) == [None, None, None]


def test_id_sequencial_nao_serve_como_destino(tmp_path):
    """O id é justamente a identidade instável que este trabalho substitui.

    Aceitá-lo seria oferecer a arma ao lado do curativo.
    """
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "1", "--executar")
    assert r.returncode == 1
    assert "não achei pessoa" in r.stderr
    assert donos(storage) == [None, None, None]


def test_uuid_serve_como_destino(tmp_path):
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "00000001-0000-4000-8000-000000000000", "--executar")
    assert r.returncode == 0, r.stderr
    assert donos(storage) == [1, 1, 1]


def test_sem_a_coluna_uuid_manda_rodar_as_migracoes(tmp_path):
    storage = montar(tmp_path, com_uuid=False)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 1
    assert "alembic" in r.stderr


# ── 8 · a ambiguidade, que é a razão de o script existir ─────────────────────

def test_duas_pessoas_no_mesmo_trabalho_param_a_migracao(tmp_path):
    """Ambiguidade real: o grafo aponta para duas pessoas."""
    storage = montar(tmp_path, notas=[(1, 1), (1, 2)])
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 2, r.stdout
    assert "MAIS DE UM proprietário plausível" in r.stdout
    assert "mapeamento explícito" in r.stdout
    assert donos(storage) == [None, None, None], "migrou apesar da ambiguidade"


def test_sinal_do_grafo_apontando_para_outra_pessoa_para_a_migracao(tmp_path):
    """O caso mais perigoso: pareceria sucesso, e teria movido o acervo de alguém.

    O trabalho 1 tem nota da pessoa 2, e o destino informado é a pessoa 1.
    """
    storage = montar(tmp_path, notas=[(1, 2)])
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 2, r.stdout
    assert "OUTRA pessoa" in r.stdout
    assert donos(storage) == [None, None, None]


def test_o_sinal_do_grafo_concordando_com_o_destino_deixa_passar(tmp_path):
    """A checagem tem de saber dizer sim, senão ela é só um bloqueio."""
    storage = montar(tmp_path, notas=[(1, 1), (2, 1)])
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 0, r.stdout + r.stderr
    assert donos(storage) == [1, 1, 1]


def test_a_ambiguidade_e_detectada_por_qualquer_das_quatro_tabelas(tmp_path):
    """Notas não são o único caminho — progresso, marcador e Canvas também."""
    storage = montar(tmp_path)
    c = sqlite3.connect(storage / "kindle_tool.db")
    c.execute("INSERT INTO progressos (id, pessoa_id, job_id) VALUES (1, 2, 1)")
    c.commit()
    c.close()
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 2, r.stdout
    assert "OUTRA pessoa" in r.stdout


# ── 1 · backup   ·   10 · idempotência   ·   11 · relatório ──────────────────

def test_o_backup_e_feito_antes_de_gravar(tmp_path):
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 0, r.stderr
    copias = list((storage / "backups").glob("antes-da-migracao-de-identidade_*.db"))
    assert len(copias) == 1, "não houve backup antes da migração"
    # E ele é o estado ANTERIOR — é o que o torna um rollback.
    c = sqlite3.connect(copias[0])
    try:
        assert [x[0] for x in c.execute("SELECT dono_id FROM processing_jobs")] == [None] * 3
    finally:
        c.close()


def test_rodar_de_novo_nao_e_erro_e_nao_muda_nada(tmp_path):
    """10 · IDEMPOTÊNCIA. A segunda execução é um nada, e não uma falha."""
    storage = montar(tmp_path)
    assert rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar").returncode == 0
    antes = donos(storage)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 0, r.stderr
    assert "Nada a migrar" in r.stdout
    assert donos(storage) == antes


def test_o_relatorio_diz_o_rollback(tmp_path):
    """12 · O procedimento de rollback vai na saída, e não só no documento.

    Quem precisa dele está com um problema agora, e não vai procurar o `.md`.
    """
    storage = montar(tmp_path)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert "Rollback:" in r.stdout
    assert "antes-da-migracao-de-identidade" in r.stdout


# ── o que NÃO migra ─────────────────────────────────────────────────────────

def test_recado_anonimo_nao_ganha_dono(tmp_path):
    """Ele nasce sem dono por desenho — a caixa de recado não pede conta.

    Dar dono a um recado anônimo é inventar propriedade, que é o que o princípio
    proíbe. Um recado sem pessoa e sem e-mail não tem dono a descobrir.
    """
    storage = montar(tmp_path, recados_anonimos=2)
    r = rodar(storage, "--destino", "pessoa1@exemplo.com", "--executar")
    assert r.returncode == 0, r.stderr
    c = sqlite3.connect(storage / "kindle_tool.db")
    try:
        assert c.execute("SELECT count(*) FROM recados WHERE pessoa_id IS NULL").fetchone()[0] == 2
    finally:
        c.close()


# ── 6/9 · transacional: reprovar desfaz ─────────────────────────────────────

def test_a_validacao_que_reprova_desfaz_tudo(tmp_path, monkeypatch):
    """Validar depois do commit é escrever um relatório sobre um estrago gravado.

    Aqui a validação roda DENTRO da transação, e este teste é o que prova isso:
    com uma verificação que sempre reprova, o banco tem de sair intacto.
    """
    sys.path.insert(0, str(RAIZ / "scripts"))
    import importlib.util

    spec = importlib.util.spec_from_file_location("migrar_identidade", SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)

    storage = montar(tmp_path)
    monkeypatch.setattr(modulo, "STORAGE", storage)
    monkeypatch.setattr(modulo, "BANCO", storage / "kindle_tool.db")
    monkeypatch.setattr(modulo, "validar", lambda *a, **k: ["veneno: uma verificação reprovou"])

    c = modulo.abrir()
    inv = modulo.inventariar(c)
    destino = modulo.achar_destino(c, "pessoa1@exemplo.com")
    c.close()

    with pytest.raises(modulo.Falhou) as erro:
        modulo.migrar(destino, inv)
    assert "nada foi gravado" in str(erro.value)
    assert donos(storage) == [None, None, None], "a transação não foi desfeita"
