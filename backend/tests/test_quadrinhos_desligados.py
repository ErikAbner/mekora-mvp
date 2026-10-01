"""A conversão de quadrinhos desligada — o que some, e o que continua dizendo por quê.

POR QUE ELA ESTÁ DESLIGADA
==========================
Duas razões, e a primeira é que sem isto NADA SOBE.

O `kindlecomicconverter` saiu do PyPI. Não por falha de segurança: o mantenedor
trocou a distribuição por binários e AppImage nas releases do GitHub (issue #464
de `ciromattia/kcc`, jan/2023), e o projeto segue vivo — 11.0.3 em 28/08/2026.
Enquanto a linha existiu no `requirements.txt`, `pip install -r` falhava com "No
matching distribution found" e a imagem não reconstruía.

A segunda é superfície: `.cbr` é RAR, e quem o abre é código C lendo arquivo de
estranho, DENTRO do processo do servidor — o isolamento do trabalhador não cabia
agora (`docs/BORDA-E-WORKER.md`). Desligar tira isso do ar enquanto ele não
existe.

O QUE ESTE ARQUIVO PROVA
========================
Que desligado quer dizer desligado nos quatro lugares onde o produto encosta em
quadrinho — a allowlist do `/upload`, a lista que a tela lê, as rotas do
pipeline e a pré-checagem —, e que LIGADO tudo volta. A bandeira é uma chave,
não uma demolição: os mais de trinta arquivos de teste do pipeline continuam
rodando com ela ligada.

O CONTROLE NEGATIVO É A PRÓPRIA ESTRUTURA: cada caso roda nos dois estados, e um
`ligados()` que devolvesse sempre a mesma coisa deixaria metade vermelha.
"""

from __future__ import annotations

import io

import pytest


@pytest.fixture
def bandeira(monkeypatch):
    def por(estado: bool) -> None:
        monkeypatch.setenv("MEKORA_QUADRINHOS", "1" if estado else "0")

    return por


def _bytes_de(nome: str) -> bytes:
    """Conteúdo que BATE com a extensão.

    O `/upload` confere a assinatura do arquivo contra a extensão declarada —
    "O conteúdo do arquivo não bate com o formato declarado". Mandar lixo faria
    todos estes casos passarem pela razão errada: a recusa viria da assinatura,
    e não da bandeira, e o teste ficaria verde mesmo com os quadrinhos ligados.
    """
    if nome.endswith(".pdf"):
        return b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
    if nome.endswith((".cbz", ".cb7", ".cbc")):
        import zipfile

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("001.jpg", b"\xff\xd8\xff\xe0" + b"0" * 64)
        return buf.getvalue()
    if nome.endswith(".cbr"):
        # A assinatura do RAR v4. O arquivo não precisa ser válido: a recusa
        # acontece antes de alguém tentar abri-lo — que é justamente o ponto,
        # porque quem abriria é o `unrar`.
        return b"Rar!\x1a\x07\x00" + b"0" * 64
    return b"0" * 64


def _mandar(client, nome: str):
    return client.post(
        "/upload",
        files={"file": (nome, io.BytesIO(_bytes_de(nome)), "application/octet-stream")},
    )


# ── 1 · a allowlist do /upload ─────────────────────────────────────────────

def test_desligado_o_cbr_e_recusado(client_cru, tmp_storage, bandeira) -> None:
    """O `.cbr` é o que mais importa: ele é RAR, e é o `unrar` que o abre."""
    bandeira(False)
    r = _mandar(client_cru, "gibi.cbr")
    assert r.status_code == 400
    assert "desligada" in r.json()["detail"].lower(), r.json()

    from app.core import quadrinhos

    assert r.json()["detail"] == quadrinhos.RAZAO, (
        "a recusa precisa dizer QUE está desligado, e não fingir que o formato é desconhecido"
    )


def test_ligado_o_cbr_volta_a_ser_aceito(client_cru, tmp_storage, bandeira) -> None:
    """O outro lado da mesma chave. Sem este caso, 'desligado' poderia ser
    'quebrado' e ninguém veria a diferença."""
    bandeira(True)
    r = _mandar(client_cru, "gibi.cbz")
    assert r.status_code != 400, r.text


def test_o_pdf_passa_nos_dois_estados(client_cru, tmp_storage, bandeira) -> None:
    """A bandeira desliga quadrinho, e não o produto."""
    for estado in (False, True):
        bandeira(estado)
        r = _mandar(client_cru, "livro.pdf")
        assert r.status_code != 400, (estado, r.text)


# ── 2 · a lista que a tela lê ──────────────────────────────────────────────

def test_a_lista_de_formatos_nao_oferece_o_que_a_porta_recusa(client_cru, bandeira) -> None:
    """O defeito antigo desta rota era oferecer `.zip`, que o backend recusava.
    Desligar quadrinho sem mexer aqui seria o mesmo defeito de novo."""
    bandeira(False)
    d = client_cru.get("/config/formatos").json()

    assert d["quadrinhos"] == []
    assert d["quadrinhos_desligados"] is True
    assert not [e for e in d["todos"] if e.startswith(".cb")]
    assert ".pdf" in d["todos"] and ".epub" in d["todos"]

    bandeira(True)
    d = client_cru.get("/config/formatos").json()
    assert ".cbr" in d["quadrinhos"] and ".cbr" in d["todos"]
    assert d["quadrinhos_desligados"] is False


# ── 3 · as rotas do pipeline ───────────────────────────────────────────────

@pytest.mark.parametrize(
    "metodo,rota",
    [
        ("post", "/jobs/1/comic-export"),
        ("post", "/jobs/1/comic-quick-pipeline"),
        ("get", "/jobs/1/comic-quick-pipeline/preflight"),
    ],
)
def test_as_rotas_respondem_503_e_nao_404(client_cru, tmp_storage, bandeira, metodo, rota) -> None:
    """503 e não 404, e a diferença não é de estilo.

    404 diria "isto nunca existiu" — mentira, e manda quem integra procurar o
    erro no próprio código. 503 diz "existe, e agora não": a instalação liga de
    volta com uma variável.
    """
    bandeira(False)
    r = client_cru.post(rota, json={}) if metodo == "post" else client_cru.get(rota)
    assert r.status_code == 503, (rota, r.status_code, r.text[:200])
    assert "desligada" in r.json()["detail"].lower()


def test_ligado_as_rotas_deixam_de_responder_503(client_cru, tmp_storage, bandeira) -> None:
    """Com a bandeira ligada a porta abre — o que vem depois é problema do
    trabalho não existir (404 do job), e não da bandeira."""
    bandeira(True)
    r = client_cru.post("/jobs/999999/comic-export", json={})
    assert r.status_code != 503, r.text


# ── 4 · a pré-checagem ─────────────────────────────────────────────────────

def test_a_pre_checagem_conta_a_bandeira_sem_fechar_a_porta(client, bandeira) -> None:
    """Quem pergunta "dá para converter?" merece "não, e por quê" — não um 503.

    Esta rota é o que a tela lê ANTES de oferecer o botão. Fechá-la faria a tela
    não saber a diferença entre "desligado" e "a máquina está sem KCC", que são
    coisas diferentes e têm consertos diferentes.
    """
    bandeira(False)
    d = client.get("/tools/comic-status")
    assert d.status_code == 200
    corpo = d.json()
    assert corpo["quadrinhos_ligados"] is False
    assert corpo["razao"]
    assert "kcc" in corpo and "argos" in corpo, "o estado da máquina continua sendo relatado"

    bandeira(True)
    corpo = client.get("/tools/comic-status").json()
    assert corpo["quadrinhos_ligados"] is True
    assert corpo["razao"] is None
