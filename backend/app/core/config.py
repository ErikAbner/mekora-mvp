import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Este arquivo está em backend/app/core/config.py.
# parents: [0]=core  [1]=app  [2]=backend  [3]=kindle-local-tool/ (raiz)
PROJECT_ROOT: Path = Path(__file__).resolve().parents[3]

# ONDE OS DOCUMENTOS FICAM, e por que isto é uma variável.
#
# O caminho era derivado da posição deste arquivo, e só dela. Isso quer dizer que
# QUALQUER processo rodando com este código escrevia no mesmo lugar — inclusive
# um servidor de prova apontado para um banco descartável, que continuava
# gravando arquivos no storage de verdade.
#
# Aconteceu em 30/08: um teste com banco isolado criou `output/2` e `output/3`
# no storage real. Nada foi perdido, porque nenhum dos dois trabalhos reais
# tinha saída — mas a colisão era questão de sorte, e sorte não é isolamento.
#
# Em container, o valor vem do Dockerfile e aponta para o volume. Fora dele, o
# padrão é o de sempre: quem não configura nada não vê diferença.
STORAGE_RAIZ: Path = Path(os.getenv("MEKORA_STORAGE", PROJECT_ROOT / "storage"))

STORAGE_INPUT: Path = STORAGE_RAIZ / "input"
STORAGE_OUTPUT: Path = STORAGE_RAIZ / "output"
STORAGE_TEMP: Path = STORAGE_RAIZ / "temp"
STORAGE_COVERS: Path = STORAGE_RAIZ / "covers"
STORAGE_LOGS: Path = STORAGE_RAIZ / "logs"


class Settings(BaseSettings):
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    kindle_email: str = ""

    # QUEM É O DONO DA INSTALAÇÃO.
    #
    # Vazio de propósito: sem este valor NINGUÉM é dono, e as rotas que falam da
    # instalação inteira respondem 403 para todo mundo. Fecha por falta, e não
    # por descuido — o contrário seria "esqueci de configurar, então está
    # aberto", que é como a maioria das instalações fica aberta.
    #
    # Aceita uma lista separada por vírgula, porque um dia pode ser mais de uma
    # pessoa e mudar o formato depois obrigaria a mexer em quem já configurou.
    dono_email: str = ""

    # QUEM PODE PEDIR UM LINK DE ENTRADA.
    #
    # O lançamento é por convite: só endereço desta lista recebe link. Sem ela,
    # `/entrar/pedir` manda mensagem para qualquer endereço que alguém escreva
    # — e a mensagem sai do domínio do Mekora, para quem nunca pediu. É o
    # achado 2 da auditoria de 03/09, que o teto por origem limitou e não
    # fechou: vinte por hora ainda são vinte estranhos por hora.
    #
    # VAZIO EM PRODUÇÃO É FECHADO, e não aberto. Fora de produção é aberto,
    # porque a máquina de quem desenvolve não tem convite nenhum e a entrada
    # precisa funcionar. Os dois lados são alcançáveis em teste — o achado 10
    # é justamente sobre ramo que só existe em produção e ninguém executa.
    #
    # O dono entra por definição: uma lista mal escrita pode trancar o dono do
    # lado de fora da própria instalação, e aí não há como consertar de dentro.
    convidados: str = ""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        extra="ignore",
    )


settings = Settings()
