"""A superfície inteira: o que um estranho alcança, e o que não.

Cada peça de acesso foi construída isolada — a porta de trabalho, a de conta, o
dono do arquivo, o limite de envio. Este arquivo olha o CONJUNTO, que é onde
moram os buracos entre peças certas.

Ele nasceu de uma revisão em 31/08 que encontrou seis rotas abertas. Nenhuma era
descuido: todas são corretas num produto de uma pessoa só rodando na própria
máquina, que é como o Mekora nasceu. O que mudou foi ele ganhar contas, e o que
era "o dono do computador" virar "qualquer um na internet".
"""

import pytest

# As rotas que falam da INSTALAÇÃO. Sem conta, cada uma vazava ou permitia algo:
# `/config` devolvia o `kindle_email` e o `smtp_user` REAIS; `/metrics` contava
# os trabalhos de todo mundo somados; `/app-config` PATCH mudava a configuração;
# `/presets` era CRUD aberto.
FECHADAS = [
    ("GET", "/config"),
    ("GET", "/app-config"),
    ("GET", "/presets"),
    ("GET", "/metrics/summary"),
    ("GET", "/metrics/usage"),
    ("GET", "/metrics/failures"),
    ("GET", "/tools/comic-status"),
    ("GET", "/translation/engines"),
]

# O que continua público, e por quê:
#   /health          — a verificação do container bate aqui, sem credencial
#   /config/formatos — a tela de entrada precisa saber o que o Mekora aceita
#                      ANTES de haver conta, porque converter sem conta é
#                      garantido pela DEC-0018
#   /eu              — responde "não entrou", que é estado normal e não erro
ABERTAS = [("GET", "/health"), ("GET", "/config/formatos"), ("GET", "/eu")]


@pytest.mark.parametrize("metodo,caminho", FECHADAS)
def test_rota_de_instalacao_exige_conta(client_cru, metodo, caminho):
    r = client_cru.request(metodo, caminho)
    assert r.status_code == 401, f"{caminho} respondeu {r.status_code} a um estranho"


@pytest.mark.parametrize("metodo,caminho", ABERTAS)
def test_rota_publica_continua_publica(client_cru, metodo, caminho):
    """A proteção não pode fechar o que precisa ficar aberto.

    Sem este teste, apertar a porta um pouco mais fecharia `/config/formatos` — e
    a tela de entrada passaria a mostrar uma lista de formatos vazia, sem erro
    nenhum aparecer.
    """
    r = client_cru.request(metodo, caminho)
    assert r.status_code == 200, f"{caminho} deveria ser público, respondeu {r.status_code}"


def test_config_nao_vaza_endereco_de_kindle_para_estranho(client_cru):
    """O caso concreto que motivou tudo isto.

    `/config` devolvia `kindle_email` — o endereço para onde os documentos de
    alguém vão — a quem pedisse, sem credencial nenhuma.
    """
    r = client_cru.get("/config")
    assert r.status_code == 401
    assert "kindle" not in r.text.lower()


def test_converter_sem_conta_continua_valendo(client_cru, sample_pdf):
    """A DEC-0018 garante isto, e fechar rotas não pode revogá-la por acidente."""
    with open(sample_pdf, "rb") as f:
        r = client_cru.post("/upload", files={"file": ("doc.pdf", f, "application/pdf")})
    assert r.status_code == 201
    assert r.json()["endereco"], "o trabalho anônimo precisa de endereço para ser alcançável"


def test_envio_sem_conta_tem_teto(client_cru, sample_pdf):
    """Sem teto de QUANTIDADE, uma máquina na internet enche o próprio disco.

    Havia limite de tamanho por arquivo — 600 MB — e nenhum de quantidade.
    """
    from app.api import vazao

    vazao._envios.clear()
    codigos = []
    for _ in range(vazao.SEM_CONTA + 2):
        with open(sample_pdf, "rb") as f:
            codigos.append(
                client_cru.post("/upload", files={"file": ("doc.pdf", f, "application/pdf")}).status_code
            )
    vazao._envios.clear()

    assert codigos.count(201) == vazao.SEM_CONTA
    assert codigos[-1] == 429


def test_a_pessoa_de_fora_nao_alcanca_o_trabalho_de_ninguem(client, client_cru, sample_pdf):
    """Um trabalho COM dono não responde a quem não é o dono.

    `client` está numa conta e `client_cru` não está em nenhuma — mas o segundo
    também não teria a chave do trabalho, que é a outra prova aceita.
    """
    with open(sample_pdf, "rb") as f:
        criado = client.post("/upload", files={"file": ("meu.pdf", f, "application/pdf")}).json()
    job = criado["upload_id"]

    for caminho in (f"/analyze/{job}", f"/jobs/{job}/status", f"/jobs/{job}/notas"):
        r = client_cru.get(caminho)
        assert r.status_code == 404, f"{caminho} respondeu {r.status_code} a um estranho"


def test_estante_de_estranho_vem_vazia(client_cru):
    """E não com os trabalhos sem dono: trabalho sem dono pertence a quem tem o
    endereço dele, não a quem chegou primeiro."""
    r = client_cru.get("/history")
    assert r.status_code == 200
    assert r.json() == []
