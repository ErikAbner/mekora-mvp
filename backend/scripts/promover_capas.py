#!/usr/bin/env python
"""Backfill: leva a capa de cada trabalho para `storage/covers/{id}/capa.png`.

    .venv/bin/python backend/scripts/promover_capas.py          # só relata
    .venv/bin/python backend/scripts/promover_capas.py --fazer  # escreve

POR QUE ELE EXISTE
==================
A capa passou a morar em `storage/covers` (ver `services/capa_service.py`), fora
do alcance do `cleanup_old_jobs`, que apaga `temp/{id}` por idade. Isso vale
para o que for feito daqui para a frente. O acervo que já existe não tem capa
nenhuma lá — e, com o emissor passando a conferir o arquivo, ele apareceria
inteiro sem capa.

TRÊS CAMINHOS, E O TERCEIRO É UMA RESPOSTA
==========================================
  copiada     a miniatura ainda está em `temp/{id}` — é uma cópia
  refeita     `temp` sumiu, mas o arquivo original está em `input/` e é PDF:
              a página escolhida é renderizada de novo
  sem-capa    não há miniatura nem original legível. Fica sem capa, e a tela
              usa o `.capa-vazia`

O terceiro não é falha. Inventar capa para um livro cujo original não existe
mais seria pior que a moldura vazia — e a moldura vazia é o que o CSS já sabe
desenhar. Medido em 04/09: dos 37 trabalhos, 1 tinha miniatura em disco, 13
tinham PDF de origem, e o resto não tem de onde tirar.

SECO POR PADRÃO. Ele escreve dentro do storage real do Erik; `--fazer` é
explícito de propósito, e a passada seca imprime exatamente o que faria.
"""
from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))

from app.core.config import STORAGE_INPUT, STORAGE_TEMP  # noqa: E402
from app.db.database import SessionLocal  # noqa: E402
# `Pessoa` ENTRA MESMO SEM SER USADA. `processing_jobs.dono_id` tem chave
# estrangeira para `pessoas`, e o SQLAlchemy só resolve isso se a classe do
# outro lado já estiver registrada no mapeador. Sem esta linha, a primeira
# consulta estoura com `NoReferencedTableError` — e estoura só às vezes,
# conforme a ordem em que os módulos foram importados antes.
from app.models.pessoa import Pessoa  # noqa: E402,F401
from app.models.processing_job import ProcessingJob  # noqa: E402
from app.services import capa_service  # noqa: E402

FAZER = "--fazer" in sys.argv


def _refazer(job) -> Path | None:
    """Renderiza a página da capa a partir do PDF de origem, para `temp/{id}`.

    Escreve em `temp` e não direto no destino porque é `capa_service.promover`
    quem decide o destino — dois lugares sabendo o layout do storage é como o
    primeiro fica desatualizado sem ninguém notar.
    """
    if not job.input_path:
        return None
    origem = Path(job.input_path)
    if not origem.exists() or origem.suffix.lower() != ".pdf":
        return None
    try:
        import fitz
    except ImportError:
        return None
    pagina = job.selected_cover_page or 0
    try:
        with fitz.open(origem) as doc:
            if pagina >= doc.page_count:
                pagina = 0
            pix = doc[pagina].get_pixmap(dpi=110)
            destino = STORAGE_TEMP / str(job.id) / f"page_{pagina}.png"
            destino.parent.mkdir(parents=True, exist_ok=True)
            pix.save(str(destino))
            return destino
    except Exception:
        return None


def main() -> int:
    db = SessionLocal()
    contas = {"copiada": 0, "refeita": 0, "sem-capa": 0, "ja-tinha": 0}
    try:
        for job in db.query(ProcessingJob).order_by(ProcessingJob.id).all():
            if capa_service.arquivo(job.id).exists():
                contas["ja-tinha"] += 1
                continue

            tem_miniatura = capa_service._origem(job) is not None
            if tem_miniatura:
                via = "copiada"
            else:
                origem = Path(job.input_path) if job.input_path else None
                pode = bool(origem and origem.exists() and origem.suffix.lower() == ".pdf")
                via = "refeita" if pode else "sem-capa"

            if FAZER and via == "refeita":
                if _refazer(job) is None:
                    via = "sem-capa"
            if FAZER and via in ("copiada", "refeita"):
                if capa_service.promover(job) is None:
                    via = "sem-capa"

            contas[via] += 1
            print(f"  {job.id:>5}  {via}")
    finally:
        db.close()

    print()
    print("  " + " · ".join(f"{k} {v}" for k, v in contas.items()))
    if not FAZER:
        print("\n  PASSADA SECA. Nada foi escrito. Repita com --fazer.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
