"""Os modelos de Kindle, e a tela que cada um tem.

POR QUE ISTO EXISTE. O nó `895:10599` mostra "Paperwhite · 1236 × 1680" no
cartão do aparelho, e o Mekora não tinha como saber: ele guarda o nome que a
pessoa deu e o endereço de envio, e a Amazon não conta o resto — não há como
descobrir o modelo pelo e-mail.

Quem sabe é a pessoa. Então o produto pergunta, e a resolução vem junto, porque
ela é do MODELO e não do aparelho: dois Paperwhite 5 têm a mesma tela.

E ISSO NÃO É ENFEITE. Até aqui, quadrinho saía no perfil `kcc_profile` da
INSTALAÇÃO — um valor só, para todo mundo. Quem tem um Oasis recebia páginas
montadas para um Paperwhite. Sabendo o modelo, o preparo usa o perfil do
aparelho para onde o arquivo vai.

A LISTA ENVELHECE, e por isso ela tem uma saída: `None` é sempre uma resposta
válida — "não sei" ou "outro" —, e nesse caso o produto segue com o padrão da
instalação, exatamente como fazia antes. Um modelo novo que não esteja aqui não
impede ninguém de usar o Mekora.

As resoluções são as que a Amazon publica para cada aparelho, e o perfil é o
nome que o KCC usa para a mesma tela.
"""

from __future__ import annotations

# chave        rótulo                        largura  altura  perfil do KCC
MODELOS: dict[str, dict] = {
    "kindle11":  {"nome": "Kindle (11ª geração)",        "largura": 1072, "altura": 1448, "kcc": "KV"},
    "kindle10":  {"nome": "Kindle (10ª geração)",        "largura": 600,  "altura": 800,  "kcc": "KV"},
    "pw5":       {"nome": "Paperwhite (11ª geração)",    "largura": 1236, "altura": 1648, "kcc": "KPW5"},
    "pw4":       {"nome": "Paperwhite (10ª geração)",    "largura": 1072, "altura": 1448, "kcc": "KV"},
    "pw3":       {"nome": "Paperwhite (7ª geração)",     "largura": 1072, "altura": 1448, "kcc": "KV"},
    "oasis3":    {"nome": "Oasis (10ª geração)",         "largura": 1264, "altura": 1680, "kcc": "KO"},
    "oasis2":    {"nome": "Oasis (9ª geração)",          "largura": 1264, "altura": 1680, "kcc": "KO"},
    "scribe":    {"nome": "Scribe",                      "largura": 1860, "altura": 2480, "kcc": "KPW5"},
    "voyage":    {"nome": "Voyage",                      "largura": 1072, "altura": 1448, "kcc": "KV"},
}


def existe(chave: str | None) -> bool:
    return chave is not None and chave in MODELOS


def como_lista() -> list[dict]:
    """A lista para a tela, com a tela de cada um já escrita.

    A ordem é a de escrita, e ela agrupa por família — Kindle, Paperwhite,
    Oasis — porque é assim que a pessoa procura o dela. Ordenar por nome
    misturaria as famílias.
    """
    return [
        {
            "chave": chave,
            "nome": m["nome"],
            "largura": m["largura"],
            "altura": m["altura"],
            # Já montado: "1236 × 1680". O sinal é o de multiplicação, e não a
            # letra x — a tela mostra uma dimensão, não uma variável.
            "tela": f"{m['largura']} × {m['altura']}",
        }
        for chave, m in MODELOS.items()
    ]


def descricao(chave: str | None) -> str | None:
    """"Paperwhite (11ª geração) · 1236 × 1680", ou nada quando não se sabe."""
    m = MODELOS.get(chave or "")
    if m is None:
        return None
    return f"{m['nome']} · {m['largura']} × {m['altura']}"


def perfil_do_kcc(chave: str | None) -> str | None:
    """O perfil que o KCC usa para esta tela. `None` quando não se sabe — e aí
    quem chama fica com o padrão da instalação, como sempre foi."""
    m = MODELOS.get(chave or "")
    return m["kcc"] if m else None
