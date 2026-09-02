"""Ambiente de migração do Mekora.

A URL do banco não é escrita aqui: ela vem de `app.db.database`, que é a mesma
que a aplicação usa. Uma cópia da URL no `alembic.ini` envelheceria no primeiro
ajuste, e uma migração aplicada no banco errado é pior que nenhuma migração.

O SQLite é o motivo do `render_as_batch`. Ele não sabe ALTER COLUMN nem DROP
COLUMN: o alembic contorna criando a tabela nova, copiando os dados e trocando —
e isso só acontece com o modo batch ligado. Sem ele, a primeira migração que não
seja `ADD COLUMN` falha, que é justamente onde a migração inline já parava.
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.database import DATABASE_URL, Base  # noqa: E402
from app.models.pessoa import Chave, Pessoa, Sessao  # noqa: E402,F401
from app.models.processing_job import ProcessingJob  # noqa: E402,F401
from app.models.aparelho import Aparelho  # noqa: E402,F401
from app.models.canvas import Ligacao, NoCanvas  # noqa: E402,F401
from app.models.estudo import Estudo, EstudoNota  # noqa: E402,F401
from app.models.nota import Nota  # noqa: E402,F401
from app.models.grupo_ignorado import GrupoIgnorado  # noqa: E402,F401
from app.models.recado import Recado  # noqa: E402,F401
from app.models.preferencia import Preferencia  # noqa: E402,F401
from app.models.progresso import Progresso  # noqa: E402,F401
from app.models.stage_metric import StageMetric  # noqa: E402,F401

config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def comparar_tipo(contexto, coluna, coluna_do_modelo, tipo_no_banco, tipo_no_modelo):
    """Diz ao alembic quais diferenças de tipo são diferenças de verdade.

    O SQLite não guarda o tipo declarado: ele guarda uma AFINIDADE. `VARCHAR`,
    `TEXT` e `CHAR(9)` têm todos afinidade TEXT e são a mesma coisa; `BOOLEAN` e
    `INTEGER` guardam ambos 0 e 1.

    Sem isto, o autogenerate vê 23 "mudanças de tipo" entre o que o modelo diz e
    o que a migração inline escreveu à mão — e cada uma vira um
    `batch_alter_table`, que no SQLite significa CRIAR A TABELA DE NOVO e copiar
    todas as linhas. Recriar uma tabela com dados dentro para não mudar nada é
    risco sem contrapartida, e voltaria em toda migração futura.

    Devolver `False` é "não há diferença aqui"; `None` deixa o alembic decidir.
    """
    familia_texto = {"TEXT", "VARCHAR", "CHAR", "CLOB"}
    familia_numero = {"INTEGER", "BOOLEAN", "BIGINT", "SMALLINT"}
    banco = str(tipo_no_banco).split("(")[0].upper()
    modelo = str(tipo_no_modelo).split("(")[0].upper()
    if banco in familia_texto and modelo in familia_texto:
        return False
    if banco in familia_numero and modelo in familia_numero:
        return False
    return None


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
        compare_type=comparar_tipo,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            compare_type=comparar_tipo,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
