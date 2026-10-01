"""As listas grandes atravessam a rede em fatias estáveis."""

from sqlalchemy.orm import sessionmaker

from app.models.estudo import Estudo, EstudoNota
from app.models.nota import Nota
from app.models.pessoa import Pessoa


def _popular(engine):
    Sessao = sessionmaker(bind=engine)
    db = Sessao()
    try:
        pessoa = db.query(Pessoa).filter(Pessoa.email == "teste@mekora.local").one()
        notas = [
            Nota(
                pessoa_id=pessoa.id,
                fonte="solta",
                trecho=f"Trecho numerado {i}",
                comentario="agulha especial" if i == 117 else "",
            )
            for i in range(125)
        ]
        db.add_all(notas)
        db.flush()
        estudos = [
            Estudo(
                pessoa_id=pessoa.id,
                nome=f"Estudo {i:03d}",
                sobre="pergunta rara" if i == 31 else "uma pergunta",
                fechado=i >= 28,
            )
            for i in range(35)
        ]
        db.add_all(estudos)
        db.flush()
        db.add_all(EstudoNota(estudo_id=estudos[i].id, nota_id=notas[i].id) for i in range(35))
        db.commit()
        return estudos[31].id
    finally:
        db.close()


def test_notas_usam_cursor_sem_repetir(client, test_engine):
    _popular(test_engine)

    primeira = client.get("/notas/pagina", params={"limite": 40}).json()
    segunda = client.get("/notas/pagina", params={"limite": 40, "cursor": primeira["proximo"]}).json()

    assert primeira["total"] == 125
    assert len(primeira["itens"]) == len(segunda["itens"]) == 40
    assert {n["id"] for n in primeira["itens"]}.isdisjoint(n["id"] for n in segunda["itens"])
    assert primeira["contagens"]["escritas-aqui"] == 125


def test_busca_de_notas_acontece_antes_da_pagina(client, test_engine):
    _popular(test_engine)
    pagina = client.get("/notas/pagina", params={"q": "agulha especial"}).json()

    assert pagina["total"] == 1
    assert pagina["itens"][0]["comentario"] == "agulha especial"


def test_estudos_entregam_resumo_e_detalhe(client, test_engine):
    estudo_procurado = _popular(test_engine)

    primeira = client.get("/estudos/pagina", params={"limite": 10}).json()
    segunda = client.get("/estudos/pagina", params={"limite": 10, "cursor": primeira["proximo"]}).json()

    assert primeira["total"] == 35
    assert len(primeira["itens"]) == len(segunda["itens"]) == 10
    assert {e["id"] for e in primeira["itens"]}.isdisjoint(e["id"] for e in segunda["itens"])
    assert primeira["itens"][0]["total_notas"] == 1
    assert len(primeira["itens"][0]["notas"]) <= 3
    assert primeira["itens"][0]["nota_ids"]
    assert len(primeira["nota_ids_reunidas"]) == 35

    busca = client.get("/estudos/pagina", params={"q": "pergunta rara"}).json()
    assert [e["id"] for e in busca["itens"]] == [estudo_procurado]

    detalhe = client.get(f"/estudos/{estudo_procurado}").json()
    assert detalhe["notas"] and detalhe["notas"][0]["trecho"]
