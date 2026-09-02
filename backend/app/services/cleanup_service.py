"""Limpeza por idade: o ORIGINAL sai, o livro fica.

DOIS DEFEITOS FORAM CORRIGIDOS AQUI EM 03/09, e eles se escondiam um ao outro.

**A limpeza nunca rodava no caso comum.** Ela filtrava `status in ("done",
"error")`, e uma conversão bem-sucedida grava `status = "converted"` — o valor
"done" é de outro campo, o `conversion_status`. Ou seja: de todo trabalho que deu
certo, o PDF original ficava no disco para sempre.

E a tela de privacidade dizia o contrário, com todas as letras: *"apagado 30 dias
depois que o preparo termina"*. Uma promessa que o código não cumpria, escrita na
tela que existe para não prometer o que não se cumpre.

**E se ela rodasse, apagaria o livro.** O laço removia `output/{id}` inteiro — o
EPUB da estante — junto do original. O comentário no `ProcessingJob` afirmava o
oposto (*"remove o input e deixa o EPUB"*), e é o comentário que estava certo
sobre a intenção: a mesma tela de privacidade diz que o resultado *"fica na sua
estante e sai quando você remove o livro"*.

Um defeito escondia o outro: consertar só o primeiro teria apagado o acervo de
todo mundo na primeira subida do servidor.

O QUE SAI: o arquivo que a pessoa enviou e a pasta temporária (miniaturas, PDF
com OCR). O que fica: o EPUB, que é o livro.

DE QUEM SAI: só de trabalho SEM DONO. O Erik decidiu em 03/09 que a conta passa a
valer isso — *"a pessoa tem os arquivos salvos com a gente enquanto o serviço
funcionar"*, e quem não entrou tem a janela do `retention_days`, hoje 90 dias.
Quem tem conta e quer o espaço de volta remove o livro, que é o outro caminho
daqui.

Chamado no startup do servidor e por POST /maintenance/cleanup.

Premissa: limpeza é best-effort — erros de remoção de arquivo individuais são
silenciados para não bloquear a inicialização.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timedelta
from pathlib import Path


# OS ESTADOS EM QUE UM TRABALHO NÃO ANDA MAIS.
#
# A lista era `("done", "error")`, e "done" nem sequer é um valor de `status`: a
# conversão bem-sucedida grava `"converted"`, e "done" é do `conversion_status`.
# Dois campos com vocabulários parecidos, e a limpeza olhando o campo certo com o
# valor do outro.
#
# `analyzed` entra: é o trabalho que foi analisado e nunca convertido — alguém
# soltou um arquivo, viu o que o Mekora propôs e foi embora. O original dele não
# tem por que ficar mais tempo que o dos outros.
#
# `uploaded` NÃO entra, e `analyzing`/`converting` também não: o primeiro é um
# arquivo que acabou de chegar e ainda vai ser lido, e os outros dois estão em
# curso. Apagar o original de um trabalho em andamento é apagar o que ele está
# lendo.
TERMINADOS = ("converted", "analyzed", "done", "error")


def cleanup_old_jobs(retention_days: int) -> dict:
    """
    Apaga arquivos associados a jobs finalizados há mais de *retention_days* dias.

    Args:
        retention_days: Número de dias de retenção após a última atualização do job.

    Returns:
        {"deleted_jobs_files": int, "cutoff": str}
    """
    # Importações locais para evitar problemas de importação circular
    from app.core.config import STORAGE_INPUT, STORAGE_OUTPUT, STORAGE_TEMP
    from app.db.database import SessionLocal
    from app.models.processing_job import ProcessingJob

    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        jobs = (
            db.query(ProcessingJob)
            .filter(
                ProcessingJob.updated_at < cutoff,
                ProcessingJob.status.in_(TERMINADOS),
                # QUEM TEM CONTA NÃO PERDE ARQUIVO POR TEMPO.
                #
                # Decisão do Erik, 03/09: a conta passa a valer justamente isso —
                # "a pessoa tem os arquivos salvos com a gente enquanto o serviço
                # funcionar". Quem não entrou tem a janela do `retention_days`.
                #
                # `dono_id.is_(None)` e não uma comparação: em SQL, `= NULL` não
                # casa com nada, nem com o próprio NULL.
                ProcessingJob.dono_id.is_(None),
            )
            .all()
        )

        deleted = 0
        for job in jobs:
            job_id = job.id

            # Remove pasta temp/{id}/ (thumbnails, PDF com OCR)
            temp_dir = STORAGE_TEMP / str(job_id)
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

            # A PASTA `output/{id}` FICA, e é o livro.
            #
            # Ela era removida junto, o que significa que a limpeza por idade
            # apagaria o EPUB da estante de alguém trinta dias depois de ele ter
            # sido preparado. A tela de privacidade promete o contrário — "o
            # resultado fica na sua estante; sai quando você remove o livro" —,
            # e o comentário no `ProcessingJob` também.
            #
            # Isso nunca aconteceu com ninguém só porque o filtro de status
            # estava errado e a limpeza não rodava. Os dois defeitos se
            # escondiam.

            # Remove arquivo de input original
            if job.input_path:
                Path(job.input_path).unlink(missing_ok=True)

            deleted += 1

        return {"deleted_jobs_files": deleted, "cutoff": str(cutoff.date())}

    finally:
        db.close()


def apagar_arquivos_do_trabalho(job) -> None:
    """Apaga os arquivos de UM trabalho, agora, a pedido de quem é dono dele.

    A `cleanup_old_jobs` faz o mesmo por idade e para muitos. Esta faz por
    ordem, e para um só — mas o QUE ELAS APAGAM É DIFERENTE, e a diferença é o
    ponto:

    - por idade, sai só o ORIGINAL: o livro continua na estante, e a pessoa nem
      fica sabendo que o PDF de trinta dias atrás foi embora;
    - por ordem, sai TUDO, o EPUB inclusive: quem pediu para remover o livro
      pediu para remover o livro.

    Elas tinham o mesmo corpo, e por isso a de idade apagava o acervo — o que
    nunca chegou a acontecer só porque o filtro de status dela estava errado e
    ela não rodava.
    """
    from app.core.config import STORAGE_OUTPUT, STORAGE_TEMP

    for pasta in (STORAGE_TEMP / str(job.id), STORAGE_OUTPUT / str(job.id)):
        if pasta.exists():
            shutil.rmtree(pasta, ignore_errors=True)

    if job.input_path:
        Path(job.input_path).unlink(missing_ok=True)
