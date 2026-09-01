"""Que outras notas parecem falar do mesmo assunto que esta.

O DESENHO RESOLVE O C16 SEM PRECISAR DE UM LIMIAR SÓ. O risco registrado dizia
que "uma palavra em comum pode ser generoso demais num acervo grande, e calibrar
com onze notas seria no escuro" — e o nó `895:8545` não pede um corte binário:
pede **três faixas nomeadas**, "Parecem próximas", "Talvez" e "Talvez um estudo".

Isso muda a natureza da decisão. Um limiar único obriga a acertar onde a linha
cai; três faixas só precisam estar em ordem, e a pessoa lê o nome da faixa junto
com a evidência. Errar a fronteira entre "próximas" e "talvez" custa um rótulo;
errar um limiar binário esconde a sugestão.

E A EVIDÊNCIA VAI JUNTO. O `CLAUDE.md` exige que a sugestão venha com as palavras
contadas ao lado, para poder ser discordada — sem elas é palpite apresentado como
fato. Cada sugestão carrega quais palavras as duas notas dividem.

O QUE ISTO NÃO É: busca semântica. Não há modelo, não há embedding, não há
serviço externo. É interseção de palavras, e a limitação é honesta — duas notas
que dizem a mesma coisa com palavras diferentes não se encontram. Registrado, e
preferível a um vetor que ninguém pode conferir.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable

# Palavras que aparecem em tudo e não dizem nada sobre o assunto. A lista é curta
# de propósito: cada palavra tirada daqui é uma ligação que deixa de existir, e
# uma lista longa acaba removendo o vocabulário do próprio acervo.
VAZIAS = {
    "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e",
    "em", "entre", "era", "essa", "esse", "esta", "este", "eu", "foi", "isso",
    "ja", "la", "mais", "mas", "me", "mesmo", "meu", "minha", "muito", "na",
    "nao", "nas", "nem", "no", "nos", "num", "numa", "o", "os", "ou", "para",
    "pela", "pelo", "por", "que", "se", "sem", "ser", "seu", "sua", "so",
    "sobre", "tem", "ter", "um", "uma", "voce", "vai", "ate", "ainda", "quando",
    "onde", "porque", "todo", "toda", "todos", "todas", "outro", "outra",
}

# Uma palavra de três letras raramente carrega assunto, e casa por acaso com
# frequência — "uso", "faz", "dia" ligariam metade do acervo.
MINIMO_DE_LETRAS = 4

# As três faixas, em ordem. O número é quantas palavras as duas notas dividem, e
# ele aparece na tela junto com as palavras — a faixa é rótulo, não veredito.
PROXIMAS = 4   # quatro palavras de assunto em comum já é um tema compartilhado
TALVEZ = 2     # duas pode ser coincidência, e por isso a faixa se chama Talvez


def _sem_acento(palavra: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", palavra)
        if unicodedata.category(c) != "Mn"
    ).lower()


def _limpar(texto: str) -> dict:
    """As palavras de assunto, da forma normalizada para COMO ELAS APARECEM.

    A comparação precisa da forma sem acento — "memória" e "memoria" são a mesma
    palavra —, mas a TELA precisa da forma original. A primeira versão devolvia
    só a normalizada, e o portão pegou: a sugestão mostrava "tambem" e "memoria"
    na cara de quem escreveu "também" e "memória".

    Normalizar para comparar é correto; mostrar o resultado da normalização é
    devolver à pessoa uma versão pior do que ela escreveu."""
    achadas: dict = {}
    for palavra in re.findall(r"[\wÀ-ÿ]+", texto or "", flags=re.UNICODE):
        chave = _sem_acento(palavra)
        if len(chave) < MINIMO_DE_LETRAS or chave in VAZIAS:
            continue
        # A primeira forma vista vence: se o texto traz "Memória" e "memória", a
        # que aparece antes é a que a pessoa leu primeiro.
        achadas.setdefault(chave, palavra.lower())
    return achadas


def _texto_da_nota(nota) -> str:
    """O trecho MAIS o comentário. O que a pessoa escreveu ao lado costuma dizer
    o assunto melhor que o trecho — é ali que ela nomeia o que viu."""
    return f"{getattr(nota, 'trecho', '') or ''} {getattr(nota, 'comentario', '') or ''}"


def faixa(quantas: int) -> str | None:
    if quantas >= PROXIMAS:
        return "proximas"
    if quantas >= TALVEZ:
        return "talvez"
    return None


def sugerir(nota, candidatas: Iterable, teto: int = 12) -> list[dict]:
    """As notas que dividem assunto com esta, da mais próxima para a menos.

    Devolve lista vazia quando não há nada — e isso é resposta, não falha. A tela
    diz "nada parecido ainda", que é diferente de esconder a seção.
    """
    minhas = _limpar(_texto_da_nota(nota))
    if not minhas:
        return []

    fora = []
    for outra in candidatas:
        if getattr(outra, "id", None) == getattr(nota, "id", None):
            continue
        dela = _limpar(_texto_da_nota(outra))
        chaves = sorted(set(minhas) & set(dela))
        # A forma de QUEM ESCREVEU a nota aberta: é a página dela.
        comuns = [minhas[c] for c in chaves]
        f = faixa(len(comuns))
        if f is None:
            continue
        fora.append({
            "id": outra.id,
            "trecho": outra.trecho,
            "cor": outra.cor,
            "origem": getattr(outra, "origem", "") or "",
            "job_id": getattr(outra, "job_id", None),
            "faixa": f,
            # AS PALAVRAS, e não só quantas. "3 em comum" não deixa discordar;
            # "repetição, fotográfica, padrão" deixa.
            "palavras": comuns[:8],
            "quantas": len(comuns),
        })

    fora.sort(key=lambda s: (-s["quantas"], s["id"]))
    return fora[:teto]
