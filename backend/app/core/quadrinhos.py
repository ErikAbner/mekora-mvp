"""A conversão de quadrinhos, e a bandeira que a desliga.

POR QUE ELA NASCE DESLIGADA
===========================
Duas razões, e a primeira é imediata.

**O `kindlecomicconverter` saiu do PyPI.** Não foi despublicado por falha de
segurança: o mantenedor trocou a distribuição por binários e AppImage nas
releases do GitHub (issue #464 do `ciromattia/kcc`, janeiro de 2023), e o
projeto segue vivo — a versão de 28/08/2026 é a 11.0.3. O que sobrou no PyPI com
nome parecido é `kindlecomicconverter-headless`, uma bifurcação de terceiro
(`whtsky/kcc`), parada na 5.5.2, com os nomes dos autores originais copiados
para os metadados. **Nome parecido e procedência diferente é como a maioria dos
ataques de cadeia entra**, e por isso ela não vira substituta por conveniência.

Enquanto a linha existia no `requirements.txt`, `pip install -r` falhava — a
imagem não reconstruía. Este era o portão de lançamento mais duro que havia, e
não estava na lista de ninguém.

**E o segundo motivo é a superfície.** Quadrinho chega como `.cbr`, e `.cbr` é
RAR: quem o abre é o `unrar`/`unar`, código C que lê arquivo de estranho. A
conversão roda DENTRO do processo do servidor — `docs/BORDA-E-WORKER.md` explica
por que isolar não cabia agora. Desligar tira essa superfície do ar enquanto o
trabalhador não está isolado.

O CÓDIGO NÃO FOI APAGADO, e nem os testes. São mais de trinta arquivos de teste
sobre o pipeline de quadrinhos, e eles continuam rodando com a bandeira ligada:
apagá-los seria jogar fora a prova de um pipeline inteiro para desligar um
recurso por um tempo. A bandeira é uma chave, não uma demolição.

    MEKORA_QUADRINHOS=1     liga de volta

LIDA NA HORA, e não no import — a lição do `EM_PRODUCAO` de 03/09: constante de
módulo avaliada no import congela no primeiro `import main` da suíte, e nenhum
`monkeypatch` a alcança depois.
"""

from __future__ import annotations

import os

LIGA = {"1", "sim", "true", "on"}

RAZAO = (
    "A conversão de quadrinhos está desligada nesta instalação. "
    "Os documentos — PDF, EPUB, DOCX, ODT, RTF, TXT e HTML — continuam funcionando."
)


def ligados() -> bool:
    return os.getenv("MEKORA_QUADRINHOS", "").strip().lower() in LIGA


def exigir(nome_da_rota: str = "") -> None:
    """Porta das rotas que só fazem sentido com o pipeline ligado.

    503 e não 404: a rota EXISTE e volta a funcionar quando a instalação a
    ligar. Um 404 diria "isto nunca existiu", que é mentira, e mandaria quem
    integra procurar o erro no próprio código.
    """
    from fastapi import HTTPException

    if not ligados():
        raise HTTPException(status_code=503, detail=RAZAO)
