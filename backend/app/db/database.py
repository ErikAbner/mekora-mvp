import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import (
    PROJECT_ROOT,
    STORAGE_COVERS,
    STORAGE_INPUT,
    STORAGE_LOGS,
    STORAGE_OUTPUT,
    STORAGE_TEMP,
)

# O caminho padrão é o de sempre, e continua valendo sem configurar nada. A
# variável existe porque dentro de um container o disco fica noutro lugar, e
# porque gerar migração exige poder apontar para um banco descartável — sem
# isso, a única forma de testar uma migração é rodá-la no banco de verdade.
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT}/storage/kindle_tool.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


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

    raiz_backend = Path(__file__).resolve().parents[2]
    cfg = Config(str(raiz_backend / "alembic.ini"))
    cfg.set_main_option("script_location", str(raiz_backend / "alembic"))
    # SQLite aguenta um escritor por vez; a migração roda antes de servir, e o
    # backend usa um worker só. Com vários, isto precisaria de trava.
    command.upgrade(cfg, "head")

