"""A prévia de link do Canvas — e o que ela recusa.

O que está sob teste aqui não é a feliz. Uma rota que busca um endereço escolhido
por quem chama é a definição de SSRF: o servidor vira um navegador do atacante,
dentro da rede onde ele está. Cada teste abaixo corresponde a um jeito
específico de essa defesa ser desfeita sem ninguém notar.
"""

from __future__ import annotations

import pytest

from app.services import previa_service
from app.services.previa_service import PreviaRecusada, buscar


PAGINA = """<html><head>
  <title>Um título qualquer</title>
  <meta property="og:title" content="A expedição" />
  <meta name="description" content="O que a expedição esperava encontrar." />
  <meta property="og:image" content="/capa.png" />
  <meta property="og:site_name" content="Diário" />
</head><body>o corpo, que não sai daqui</body></html>"""


class _Resposta:
    def __init__(self, status=200, tipo="text/html; charset=utf-8", corpo=PAGINA, local=None):
        self.status_code = status
        self.headers = {"content-type": tipo}
        if local:
            self.headers["location"] = local
        self.content = corpo.encode()
        self.encoding = "utf-8"


@pytest.fixture
def rede(monkeypatch):
    """Nenhum teste sai para a internet: a rede é substituída e as chamadas
    ficam registradas, para se poder afirmar o que NÃO foi buscado."""
    pedidos = []

    class _Cliente:
        def __init__(self, *a, **k): pass
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def get(self, url):
            pedidos.append(url)
            return respostas.get(url) or _Resposta()

    respostas: dict = {}
    monkeypatch.setattr(previa_service.httpx, "Client", _Cliente)
    # Todo nome resolve para um IP público, salvo quando o teste disser outra coisa.
    monkeypatch.setattr(previa_service.socket, "getaddrinfo",
                        lambda host, _p: [(2, 1, 6, "", ("93.184.216.34", 0))])
    return {"pedidos": pedidos, "respostas": respostas}


# ── o caminho que funciona ──────────────────────────────────────────────────

def test_le_titulo_descricao_imagem_e_site(rede):
    p = buscar("https://exemplo.com/expedicao")
    assert p["titulo"] == "A expedição"
    assert p["descricao"] == "O que a expedição esperava encontrar."
    assert p["imagem"] == "https://exemplo.com/capa.png"   # relativo, resolvido
    assert p["site"] == "Diário"
    # O CORPO NÃO SAI DA PÁGINA. A prévia é título, descrição e imagem.
    assert "o corpo" not in str(p)


def test_sem_og_cai_no_title(rede, monkeypatch):
    rede["respostas"]["https://exemplo.com/x"] = _Resposta(
        corpo="<html><head><title>  Só   o  title </title></head></html>")
    assert buscar("https://exemplo.com/x")["titulo"] == "Só o title"


# ── o que ela recusa ────────────────────────────────────────────────────────

@pytest.mark.parametrize("endereco", [
    "file:///etc/passwd",
    "gopher://exemplo.com/",
    "ftp://exemplo.com/arquivo",
])
def test_so_http_e_https(rede, endereco):
    """Sem isto a rota lê o disco do servidor."""
    with pytest.raises(PreviaRecusada):
        buscar(endereco)
    assert rede["pedidos"] == []


@pytest.mark.parametrize("ip", [
    "127.0.0.1",        # o próprio servidor
    "10.0.0.5",         # rede privada
    "192.168.1.1",      # o roteador de casa
    "169.254.169.254",  # o serviço de metadados da nuvem
    "0.0.0.0",
])
def test_endereco_que_aponta_para_dentro_e_recusado(rede, monkeypatch, ip):
    """O IP É CONFERIDO, e não o nome: `localhost.meu-dominio.com` resolve para
    127.0.0.1 e passaria por qualquer filtro feito sobre o texto."""
    monkeypatch.setattr(previa_service.socket, "getaddrinfo",
                        lambda host, _p: [(2, 1, 6, "", (ip, 0))])
    with pytest.raises(PreviaRecusada):
        buscar("https://parece-publico.com/")
    assert rede["pedidos"] == []


def test_um_ip_publico_e_um_privado_no_mesmo_nome_e_recusado(rede, monkeypatch):
    """Conferir só o primeiro deixa passar o segundo."""
    monkeypatch.setattr(previa_service.socket, "getaddrinfo", lambda host, _p: [
        (2, 1, 6, "", ("93.184.216.34", 0)),
        (2, 1, 6, "", ("127.0.0.1", 0)),
    ])
    with pytest.raises(PreviaRecusada):
        buscar("https://dois-ips.com/")


def test_redirecionamento_para_dentro_da_rede_e_recusado(rede, monkeypatch):
    """Um endereço público que responde 302 para o serviço de metadados é o
    caminho mais curto para as credenciais da máquina."""
    rede["respostas"]["https://publico.com/"] = _Resposta(
        status=302, local="http://169.254.169.254/latest/meta-data/")

    def resolve(host, _p):
        privado = host == "169.254.169.254"
        return [(2, 1, 6, "", ("169.254.169.254" if privado else "93.184.216.34", 0))]

    monkeypatch.setattr(previa_service.socket, "getaddrinfo", resolve)
    with pytest.raises(PreviaRecusada):
        buscar("https://publico.com/")
    # Bateu no primeiro, e NÃO no segundo.
    assert rede["pedidos"] == ["https://publico.com/"]


def test_imagem_que_aponta_para_dentro_sai_da_previa(rede, monkeypatch):
    """A imagem também é endereço vindo de fora, e a tela vai carregá-la."""
    rede["respostas"]["https://exemplo.com/y"] = _Resposta(
        corpo='<html><head><meta property="og:image" content="http://127.0.0.1:8199/x.png"/></head></html>')

    def resolve(host, _p):
        return [(2, 1, 6, "", ("127.0.0.1" if host == "127.0.0.1" else "93.184.216.34", 0))]

    monkeypatch.setattr(previa_service.socket, "getaddrinfo", resolve)
    assert buscar("https://exemplo.com/y")["imagem"] == ""


def test_o_que_nao_e_pagina_nao_vira_previa(rede):
    rede["respostas"]["https://exemplo.com/z.pdf"] = _Resposta(tipo="application/pdf", corpo="%PDF")
    with pytest.raises(PreviaRecusada):
        buscar("https://exemplo.com/z.pdf")


def test_redirecionar_sem_fim_para(rede, monkeypatch):
    rede["respostas"]["https://volta.com/"] = _Resposta(status=302, local="https://volta.com/")
    with pytest.raises(PreviaRecusada):
        buscar("https://volta.com/")
    assert len(rede["pedidos"]) <= previa_service.SALTOS + 1


def test_o_cabecalho_do_agente_cabe_num_cabecalho_http():
    """Um cabeçalho HTTP é latin-1, e um acento dentro dele derruba o pedido
    inteiro com `UnicodeEncodeError` antes de sair da máquina.

    Aconteceu: o agente dizia "prévia de link" e a rota respondia 500 para todo
    endereço. Os testes não pegaram porque eles substituem o cliente HTTP, e a
    codificação do cabeçalho só acontece no cliente de verdade.
    """
    previa_service.AGENTE.encode("latin-1")
