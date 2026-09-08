"""Um motor de tradução de mentira, para exercitar o SISTEMA — item `A2`.

    MEKORA_MOTOR_DE_TESTE=ok             sucesso determinístico
    MEKORA_MOTOR_DE_TESTE=erro           levanta EngineNotInstalledError
    MEKORA_MOTOR_DE_TESTE=indisponivel   levanta LanguagePairNotAvailableError
    MEKORA_MOTOR_DE_TESTE=timeout:3      dorme 3s e levanta TimeoutError
    MEKORA_MOTOR_DE_TESTE=invalido       devolve resposta que não é texto
    MEKORA_MOTOR_DE_TESTE=cancelamento   levanta na terceira chamada
    MEKORA_MOTOR_DE_TESTE=ok:2           sucesso, mas só depois de 2 falhas

ELE NÃO TENTA TRADUZIR. A qualidade de tradução é problema do modelo; o que este
arquivo existe para responder é outra coisa — **o que o Mekora faz quando o
motor se comporta de um jeito ou de outro.** São perguntas que nenhum modelo de
verdade responde de forma repetível:

    o job fica preso em `in_progress` quando o motor estoura?
    o cancelamento chega, ou a página termina primeiro?
    uma resposta que não é texto vira erro claro, ou `AttributeError` no log?
    o arquivo parcial é limpo?
    o `retry` refaz o trabalho ou duplica?

POR QUE ESTA É A SEAM, e não uma camada nova
============================================
`TranslatorEngine` já era a fronteira certa: dois métodos, sem estado
compartilhado com o resto, e os dois pipelines recebem a instância PRONTA por
parâmetro (`engine=`). O que faltava não era abstração — era um único lugar onde
a instância é escolhida. Isso agora é `translation_engine.criar_motor`, e é onde
este motor entra.

Nada mais mudou: os contratos, a orquestração e os testes existentes seguem
iguais. A auditoria de 08/09 procurou uma seam mais fina e não há: abaixo de
`translate(text, source, target) -> str` só existe o modelo.

POR VARIÁVEL DE AMBIENTE, e não por configuração
================================================
A configuração é do produto e aparece na tela. Um motor de mentira escolhível na
tela é um motor de mentira que alguém escolhe sem querer — e o resultado é um
livro "traduzido" que ninguém consegue explicar. A variável de ambiente é
deliberada por definição: ninguém a define por engano.
"""

from __future__ import annotations

import os
import time

from app.services.translation_engine import (
    EngineNotInstalledError,
    LanguagePairNotAvailableError,
)


class RespostaInvalida:
    """O que um modelo devolve quando o contrato quebra.

    Não é `str`, não é `None`, e não levanta ao ser criado — chega ao pipeline
    parecendo um resultado e explode na primeira operação de texto. É o formato
    do defeito real: uma versão de biblioteca que muda o formato da saída.
    """

    def __repr__(self) -> str:  # pragma: no cover - só aparece em log
        return "<RespostaInvalida>"


class MotorDeTeste:
    """Implementa `TranslatorEngine` com comportamento escrito no roteiro."""

    # O mesmo teto do NLLB, para que o particionamento de blocos seja exercido
    # exatamente como será com o motor de verdade.
    max_input_chars = 900

    def __init__(self, roteiro: str | None = None) -> None:
        bruto = (roteiro or os.getenv("MEKORA_MOTOR_DE_TESTE") or "ok").strip()
        nome, _, argumento = bruto.partition(":")
        self.modo = nome.lower() or "ok"
        self.argumento = argumento
        self.chamadas = 0

    # ------------------------------------------------------------------
    # Interface TranslatorEngine
    # ------------------------------------------------------------------

    def is_pair_available(self, source: str, target: str) -> bool:
        if self.modo == "erro":
            raise EngineNotInstalledError("motor de teste: biblioteca ausente (simulado)")
        if self.modo == "indisponivel":
            raise LanguagePairNotAvailableError(
                f"motor de teste: par {source}→{target} indisponível (simulado)"
            )
        return True

    def translate(self, text: str, source: str, target: str):
        self.chamadas += 1

        if self.modo == "erro":
            raise EngineNotInstalledError("motor de teste: biblioteca ausente (simulado)")

        if self.modo == "indisponivel":
            raise LanguagePairNotAvailableError(
                f"motor de teste: par {source}→{target} indisponível (simulado)"
            )

        if self.modo == "timeout":
            # Dorme de verdade: um timeout que não gasta tempo não exercita o
            # que se quer medir, que é o sistema esperando.
            time.sleep(float(self.argumento or 5))
            raise TimeoutError("motor de teste: tempo esgotado (simulado)")

        if self.modo == "invalido":
            return RespostaInvalida()  # type: ignore[return-value]

        if self.modo == "cancelamento":
            # Levanta a partir da terceira chamada: as duas primeiras existem
            # para que haja trabalho FEITO na hora do cancelamento, que é o
            # caso interessante — cancelar antes de começar não prova nada.
            if self.chamadas >= 3:
                raise KeyboardInterrupt("motor de teste: cancelado (simulado)")

        if self.modo == "ok" and self.argumento:
            # `ok:2` falha duas vezes e depois passa. É o roteiro de quem testa
            # nova tentativa: um `retry` que "funciona" porque nunca falhou não
            # foi testado.
            if self.chamadas <= int(self.argumento):
                raise EngineNotInstalledError(
                    f"motor de teste: falha {self.chamadas} de {self.argumento} (simulado)"
                )

        # DETERMINÍSTICO E RECONHECÍVEL. O prefixo faz um texto que vazou para o
        # produto ser óbvio na tela, e o `source→target` prova que os idiomas
        # chegaram certos até aqui.
        return f"[{source}→{target}] {text}"
