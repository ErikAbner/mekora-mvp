#!/usr/bin/env python
"""Migração C10: os caminhos guardados ainda apontam para a pasta ANTIGA.

    .venv/bin/python backend/scripts/migrar_caminhos.py          # só relata
    .venv/bin/python backend/scripts/migrar_caminhos.py --fazer  # escreve

O QUE FOI MEDIDO EM 04/09
=========================
Os 37 trabalhos guardam 77 caminhos em seis colunas. TODOS são absolutos e
TODOS apontam para `/Users/sipnm/Projeto-kindle/kindle-local-tool/storage/…`,
que é onde o projeto morava antes de virar `~/dev/mekora`. Nenhum resolve.

O produto parecia inteiro porque os dois emissores de URL — `_leitura_url` e
`_epub_url` — jogam o caminho fora e ficam só com `Path(...).name`, montando
`/storage/output/{token}/{nome}` a partir da raiz ATUAL. Ler o livro funciona.
O que usa o caminho em si é que está morto:

  reconverter        `Path(job.translated_artifact_path or ... or input_path)`
  capa no Calibre    `cover = Path(job.cover_path)`
  tamanho do arquivo `_bytes_de` devolve None, e a ficha não mostra o peso
  limpeza por idade  `Path(job.input_path).unlink(missing_ok=True)` não acha
                     nada e não apaga nada — e é por isso que há 20 arquivos
                     originais em `storage/input` que trabalho nenhum alcança

O último tem consequência de privacidade, e não de arrumação: a tela promete
que o original vai embora, e o `unlink` mira num caminho que não existe. Ele
falha em silêncio porque `missing_ok=True` — a guarda que esconde a falta em
vez de falar dela, terceira vez esta semana.

O QUE ESTE ARQUIVO FAZ
======================
  reescrito  o prefixo antigo vira a raiz atual E o arquivo existe lá
  anulado    reescrito, e mesmo assim não existe — o caminho apontava para
             `temp/`, que o `cleanup_old_jobs` apaga por idade

Anular é a parte que precisa de decisão, e é por isso que a passada é seca por
padrão. Um caminho que não resolve é uma afirmação falsa: `_bytes_de` já trata
`None` como "não sei" e cala, enquanto o caminho morto faz o produto dizer que
sabe onde o arquivo está. `None` é a resposta honesta — mas é uma informação
que sai, e sair é irreversível sem backup.

Medido: dos 77, **33 resolvem** depois da reescrita (19 originais, 14 EPUBs) e
44 não — os 44 moravam em `temp/`.
"""
from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))

from app.core.config import STORAGE_RAIZ  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
# `Pessoa` ENTRA MESMO SEM SER USADA. `processing_jobs.dono_id` tem chave
# estrangeira para `pessoas`, e o SQLAlchemy só resolve isso se a classe do
# outro lado já estiver registrada no mapeador. Sem esta linha, a primeira
# consulta estoura com `NoReferencedTableError` — e estoura só às vezes,
# conforme a ordem em que os módulos foram importados antes.
from app.models.pessoa import Pessoa  # noqa: E402,F401
from app.models.processing_job import ProcessingJob  # noqa: E402

ANTIGA = "/Users/sipnm/Projeto-kindle/kindle-local-tool/storage"
CAMPOS = [
    "input_path",
    "processed_pdf_path",
    "epub_path",
    "epub_web_path",
    "cover_path",
    "translated_artifact_path",
]
FAZER = "--fazer" in sys.argv


def main() -> int:
    db = SessionLocal()
    contas = {"reescrito": 0, "anulado": 0, "ja-certo": 0}
    try:
        for job in db.query(ProcessingJob).order_by(ProcessingJob.id).all():
            for campo in CAMPOS:
                valor = getattr(job, campo, None)
                if not valor:
                    continue
                atual = Path(valor)
                if atual.exists():
                    contas["ja-certo"] += 1
                    continue
                novo = Path(str(valor).replace(ANTIGA, str(STORAGE_RAIZ)))
                if novo.exists():
                    contas["reescrito"] += 1
                    if FAZER:
                        setattr(job, campo, str(novo))
                else:
                    contas["anulado"] += 1
                    if FAZER:
                        setattr(job, campo, None)
        if FAZER:
            db.commit()
    finally:
        db.close()

    print("  " + " · ".join(f"{k} {v}" for k, v in contas.items()))
    if not FAZER:
        print("\n  PASSADA SECA. Nada foi escrito. Repita com --fazer.")
        print("  ANTES DE --fazer: `.venv/bin/python scripts/backup.py`, porque anular apaga informação.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
