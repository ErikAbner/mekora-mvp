"""A nota sobrevive à exclusão do livro — `DEC-0021 §15`.

POR QUE ESTE ARQUIVO EXISTE: até 03/09 o esquema fazia o contrário. `notas.job_id`
tinha `ondelete="CASCADE"`, e apagar um livro apagava as notas dele — o produto
avisava antes, então era honesto, e destruía assim mesmo o que a norma manda
preservar. A norma dá a razão: é trabalho intelectual de quem escreveu, e não
derivado do arquivo.

Uma perda irreversível que o código documentava como regra não pode depender de
ninguém lembrar. O que estes casos afirmam é o EFEITO: depois de apagar o livro,
a nota está lá, com o texto que a pessoa escreveu, e dizendo de onde veio.
"""
from __future__ import annotations

import pytest
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def livro_com_nota(client, test_engine):
    """Um trabalho com uma nota de leitura da pessoa de teste."""
    from app.models.processing_job import ProcessingJob

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        job = ProcessingJob(
            original_filename="diario.pdf",
            final_title="Diário 02",
            status="converted",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    r = client.post(f"/jobs/{job_id}/notas", json={
        "capitulo": 3, "de": 10, "ate": 40, "cor": "amarelo",
        "trecho": "a repetição transforma imagem em dado",
        "comentario": "isto serve para o capítulo de método",
        "antes": "e ", "depois": ".",
    })
    assert r.status_code == 201, r.text
    return {"job": job_id, "nota": r.json()["id"]}


def test_apagar_o_livro_nao_apaga_a_nota(client, livro_com_nota):
    job, nota = livro_com_nota["job"], livro_com_nota["nota"]

    assert client.delete(f"/jobs/{job}").status_code == 204

    todas = client.get("/notas/todas").json()
    sobrevivente = next((n for n in todas if n["id"] == nota), None)
    assert sobrevivente is not None, "a nota foi apagada junto com o livro"

    # O QUE A PESSOA ESCREVEU CONTINUA INTEIRO. É ele que a norma protege.
    assert sobrevivente["trecho"] == "a repetição transforma imagem em dado"
    assert sobrevivente["comentario"] == "isto serve para o capítulo de método"


def test_a_origem_fica_marcada_como_removida(client, livro_com_nota):
    """`SET NULL` sozinho não basta: sem a marca, a nota que perdeu o livro fica
    indistinguível da nota escrita no Canvas, que nunca teve um."""
    job, nota = livro_com_nota["job"], livro_com_nota["nota"]

    antes = client.get(f"/notas/{nota}").json()
    assert antes["origem_removida_em"] is None
    assert antes["livro"]["titulo"] == "Diário 02"

    client.delete(f"/jobs/{job}")

    depois = client.get(f"/notas/{nota}").json()
    assert depois["origem_removida_em"] is not None, "a origem sumiu sem ser marcada"
    assert depois["livro"] is None
    assert depois["job_id"] is None
    # O TÍTULO É COPIADO ANTES DE O LIVRO SUMIR: depois não há de onde tirá-lo.
    assert depois["origem"] == "Diário 02"


def test_a_nota_do_kindle_nao_tem_a_origem_reescrita(client, test_engine):
    """A nota importada já traz o título que o Kindle escreveu, e sobrescrevê-lo
    trocaria o que a pessoa viu por um nome de arquivo."""
    from app.models.nota import Nota
    from app.models.pessoa import Pessoa
    from app.models.processing_job import ProcessingJob

    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        job = ProcessingJob(original_filename="qualquer.pdf", final_title="Título do Mekora")
        db.add(job)
        db.flush()
        eu = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").first()
        db.add(Nota(
            pessoa_id=eu.id, job_id=job.id, fonte="kindle",
            origem="O que o Kindle escreveu", trecho="um trecho", comentario="",
        ))
        db.commit()
        job_id = job.id
    finally:
        db.close()

    client.delete(f"/jobs/{job_id}")

    nota = next(n for n in client.get("/notas/todas").json() if n["origem"])
    assert nota["origem"] == "O que o Kindle escreveu"
    assert nota["origem_removida_em"] is not None


def test_a_chave_estrangeira_e_SET_NULL_no_banco(client, livro_com_nota, test_engine):
    """A guarda mora no ESQUEMA, e não na rota.

    A rota marca a origem; quem impede a nota de ser apagada é o `ondelete`. Sem
    este caso, trocar `SET NULL` por `CASCADE` de volta passaria despercebido em
    qualquer caminho de exclusão que não passe por `remover_da_estante` — a
    limpeza por idade, um `db.delete(job)` novo, uma migração.
    """
    from sqlalchemy import text

    job = livro_com_nota["job"]
    Sessao_ = sessionmaker(bind=test_engine)
    db = Sessao_()
    try:
        esquema = db.execute(
            text("SELECT sql FROM sqlite_master WHERE name = 'notas'")
        ).fetchone()[0]
        assert "ON DELETE SET NULL" in esquema.upper(), esquema

        # E o comportamento, não só a declaração: apagar direto no banco.
        db.execute(text("DELETE FROM processing_jobs WHERE id = :i"), {"i": job})
        db.commit()
        sobrou = db.execute(
            text("SELECT count(*) FROM notas WHERE id = :i"), {"i": livro_com_nota["nota"]}
        ).fetchone()[0]
        assert sobrou == 1, "a cascata voltou: apagar o trabalho no banco levou a nota"
    finally:
        db.close()
