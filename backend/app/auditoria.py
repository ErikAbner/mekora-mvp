"""A evidência de todo acesso privilegiado — `DEC-0041`.

POR QUE ISTO EXISTE
===================
Até 07/09 o Mekora tinha uma porta de dono (`exigir_dono`, quatro routers) e
NENHUM registro de quem a atravessou. Uma delas — `GET /recados` — devolve o
texto que as pessoas escreveram, com o e-mail delas. Ou seja: existia acesso
humano a conteúdo de usuário, e ele não deixava rastro nenhum.

O Erik, ao fechar a `C2`:

    Todo acesso privilegiado deve gerar evidência contendo pelo menos:
    identidade de quem acessou; data/hora; motivo; escopo; usuário/recursos
    afetados; ação realizada; resultado.

São os sete campos deste arquivo, e nenhum é opcional na escrita: um registro
com metade dos campos é pior que nenhum, porque parece auditoria.

POR QUE FORA DO BANCO
=====================
    Quando tecnicamente razoável, preserve o registro de auditoria de forma que
    um acesso ao dado principal não permita silenciosamente apagar também a
    evidência do acesso.

Um `DELETE FROM` no `kindle_tool.db` não alcança um arquivo que não está nele.
O formato é JSONL aberto em modo APPEND: cada linha é um evento fechado, e
escrever nunca reescreve o que já está lá.

**O limite vai dito, e não escondido:** quem tem o disco tem os dois. Isto não é
um cofre; é a diferença entre apagar dado e apagar dado *sem deixar sinal*. Uma
garantia real exigiria destino fora da máquina, e isso é decisão de
infraestrutura que a `DEC-0041` deixa nomeada e aberta.

NÃO ENTRA AQUI O QUE ELE FOI VER
================================
O evento guarda ROTA, ESCOPO e CONTAGEM — nunca o conteúdo lido. Um registro de
auditoria que copia o recado para provar que alguém leu o recado duplica o
vazamento que ele existe para vigiar. É a `DEC-0040` aplicada ao próprio
instrumento: identificador opaco e contagem são metadado operacional; o texto
não é.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# Os mesmos 90 dias dos eventos de uso (`DEC-0029`), e por uma razão de
# operação: dois prazos para lembrar viram um prazo lembrado e outro esquecido.
# Noventa dias cobrem a janela em que um incidente ainda é investigável.
DIAS_DE_GUARDA = 90

CAMPOS = ("quando", "quem", "motivo", "escopo", "alvo", "acao", "resultado")


def _pasta() -> Path:
    from app.core.config import STORAGE_RAIZ

    return Path(STORAGE_RAIZ) / "auditoria"


def _arquivo(quando: datetime) -> Path:
    """Um arquivo por mês. Rotação por nome, sem processo que a faça."""
    return _pasta() / f"acesso-{quando:%Y-%m}.jsonl"


def registrar(
    *,
    quem: Optional[str],
    motivo: str,
    escopo: str,
    alvo: str,
    acao: str,
    resultado: str,
) -> None:
    """Escreve um evento. NUNCA levanta.

    Auditoria que derruba a requisição é auditoria que alguém desliga na
    primeira madrugada. Falhar em silêncio aqui é o mal menor — e o silêncio é
    visível, porque o arquivo do mês simplesmente para de crescer.
    """
    quando = datetime.now(timezone.utc)
    evento = {
        "quando": quando.isoformat(),
        "quem": quem or "(sem sessão)",
        "motivo": motivo,
        "escopo": escopo,
        "alvo": alvo,
        "acao": acao,
        "resultado": resultado,
    }
    try:
        pasta = _pasta()
        pasta.mkdir(parents=True, exist_ok=True)
        linha = json.dumps(evento, ensure_ascii=False) + "\n"
        # O_APPEND é do sistema operacional, e não do Python: duas escritas
        # concorrentes não se sobrepõem, e nada reposiciona o cursor.
        fd = os.open(_arquivo(quando), os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        try:
            os.write(fd, linha.encode("utf-8"))
        finally:
            os.close(fd)
    except Exception:  # noqa: BLE001 — ver a docstring
        pass


def ler(desde: Optional[datetime] = None, limite: int = 500) -> list[dict]:
    """Os eventos guardados, do mais novo para o mais velho.

    É por aqui que a revisão periódica da `DEC-0041` acontece: sem uma forma de
    LER, o registro é um arquivo que ninguém abre, e "temos auditoria" vira uma
    frase sem consequência.
    """
    pasta = _pasta()
    if not pasta.is_dir():
        return []
    eventos: list[dict] = []
    for arquivo in sorted(pasta.glob("acesso-*.jsonl"), reverse=True):
        try:
            linhas = arquivo.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for linha in reversed(linhas):
            linha = linha.strip()
            if not linha:
                continue
            try:
                evento = json.loads(linha)
            except json.JSONDecodeError:
                # UMA LINHA QUEBRADA NÃO APAGA O ARQUIVO. Escrita interrompida
                # por queda deixa meia linha; descartar essa linha e seguir é o
                # que preserva as outras.
                continue
            if desde is not None:
                try:
                    if datetime.fromisoformat(evento["quando"]) < desde:
                        return eventos
                except (KeyError, ValueError):
                    pass
            eventos.append(evento)
            if len(eventos) >= limite:
                return eventos
    return eventos


def limpar(dias: int = DIAS_DE_GUARDA) -> int:
    """Apaga os arquivos mensais inteiramente vencidos. Devolve quantos foram.

    Por ARQUIVO e não por linha, de propósito: reescrever o arquivo para tirar
    linhas velhas é exatamente a operação que um registro append-only não deve
    saber fazer — quem pode reescrever para limpar pode reescrever para sumir
    com um evento.
    """
    pasta = _pasta()
    if not pasta.is_dir():
        return 0
    corte = datetime.now(timezone.utc) - timedelta(days=dias)
    # Um arquivo só vence quando o MÊS INTEIRO dele venceu: o de 2026-06 só sai
    # quando 2026-06-30 está atrás do corte.
    apagados = 0
    for arquivo in pasta.glob("acesso-*.jsonl"):
        try:
            ano, mes = arquivo.stem.split("-")[1:3]
            primeiro = datetime(int(ano), int(mes), 1, tzinfo=timezone.utc)
        except (ValueError, IndexError):
            continue
        seguinte = datetime(
            primeiro.year + (primeiro.month == 12),
            1 if primeiro.month == 12 else primeiro.month + 1,
            1,
            tzinfo=timezone.utc,
        )
        if seguinte <= corte:
            try:
                arquivo.unlink()
                apagados += 1
            except OSError:
                pass
    return apagados
