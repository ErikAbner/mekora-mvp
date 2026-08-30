import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import (
    STORAGE_COVERS,
    STORAGE_INPUT,
    STORAGE_LOGS,
    STORAGE_OUTPUT,
    STORAGE_RAIZ,
    STORAGE_TEMP,
)

# O caminho padrão é o de sempre, e continua valendo sem configurar nada. A
# variável existe porque dentro de um container o disco fica noutro lugar, e
# porque gerar migração exige poder apontar para um banco descartável — sem
# isso, a única forma de testar uma migração é rodá-la no banco de verdade.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{STORAGE_RAIZ}/kindle_tool.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Toda restrição nasce com nome, e isso não é organização: é o que permite
# alterá-la depois.
#
# O SQLite não sabe ALTER CONSTRAINT. O alembic contorna criando a tabela nova,
# copiando os dados e trocando — e para copiar uma restrição ele precisa saber
# como ela se chama. Uma chave estrangeira anônima faz a migração parar no meio
# com "Constraint must have a name", que foi exatamente o que aconteceu aqui em
# 30/08.
#
# Definido no metadata, e não caso a caso: escrito à mão em cada migração, o
# nome é esquecido justamente na que tiver pressa.
CONVENCAO = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCAO)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Cria diretórios de storage e inicializa as tabelas do banco."""
    for directory in (STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP, STORAGE_COVERS, STORAGE_LOGS):
        directory.mkdir(parents=True, exist_ok=True)

    # As tabelas nascem da migração, e não de `create_all`. Os dois juntos
    # divergem: `create_all` cria o que o modelo diz hoje, a migração cria o que
    # foi escrito — e quando discordam, ninguém sabe qual venceu.

    _migrar()


def _migrar() -> None:
    """Leva o banco até a última migração.

    Isto era, até 30/08, uma lista de 24 `ALTER TABLE ADD COLUMN` num laço com
    `except Exception: pass`. Ela funcionava, e três coisas nela custavam caro:

    A lista só crescia — uma linha por mudança, para sempre, sem que ninguém
    pudesse dizer quais já tinham rodado.

    Ela só sabia acrescentar coluna. Renomear, mudar tipo, criar índice ou
    desfazer não tinham caminho nenhum.

    E o `except Exception: pass` engolia qualquer falha, não só a esperada. Banco
    travado, disco cheio, arquivo corrompido: a migração falhava em silêncio e a
    aplicação subia parecendo saudável, para quebrar depois com `no such column`
    no meio do trabalho de alguém. Em produção, com dados dentro, esse silêncio é
    o defeito — não a falha.

    O alembic troca isso por uma versão gravada no próprio banco e por uma falha
    que aparece na hora, no lugar certo.

    Chamado aqui, e não só no deploy, de propósito: uma porta só, igual na
    máquina de quem desenvolve e no servidor. Migração que roda por um caminho
    diferente do que se testa é migração não testada.
    """
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect

    # UM BANCO QUE JÁ TEM TABELAS E NÃO TEM VERSÃO é o banco de antes desta
    # mudança — feito por `create_all` e pela migração inline. Rodar a migração
    # nele falha com "table processing_jobs already exists", que não diz nada
    # sobre o que fazer.
    #
    # O que fazer é `alembic stamp`: declarar que aquele esquema JÁ corresponde
    # à primeira migração, sem reaplicá-la. Isso não é automático de propósito —
    # marcar sozinho um banco cujo esquema ninguém conferiu esconderia uma
    # divergência real em vez de mostrá-la.
    # O que conta é a VERSÃO GRAVADA, e não a tabela que a guarda. Uma migração
    # interrompida no meio deixa `alembic_version` criada e vazia — e checar só a
    # existência da tabela daria esse banco por versionado, mandando a migração
    # tentar criar tabelas que já estão lá.
    tabelas = set(inspect(engine).get_table_names())
    versionado = False
    if "alembic_version" in tabelas:
        with engine.connect() as conexao:
            versionado = conexao.execute(text("SELECT count(*) FROM alembic_version")).scalar() > 0

    if tabelas - {"alembic_version"} and not versionado:
        raise RuntimeError(
            "Este banco tem tabelas mas nenhuma versão gravada — ele é anterior "
            "às migrações.\n\n"
            "Confira que o esquema dele bate com o do modelo e então declare a "
            "versão, de dentro de backend/:\n\n"
            "    alembic stamp head\n\n"
            "Faça backup antes: python3 scripts/backup.py"
        )

    raiz_backend = Path(__file__).resolve().parents[2]
    cfg = Config(str(raiz_backend / "alembic.ini"))
    cfg.set_main_option("script_location", str(raiz_backend / "alembic"))
    # SQLite aguenta um escritor por vez; a migração roda antes de servir, e o
    # backend usa um worker só. Com vários, isto precisaria de trava.
    command.upgrade(cfg, "head")

