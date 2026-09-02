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


# ---------------------------------------------------------------------------
# Os grupos: "Você ligou" (nó 895:8849)
# ---------------------------------------------------------------------------

# Um grupo precisa de pelo menos três notas para valer a pena mostrar. Com duas
# a ligação entre as duas já diz tudo o que há para dizer, e ela aparece na
# página de cada uma.
MINIMO_DO_GRUPO = 3

# E precisa ATRAVESSAR LIVROS. Três notas do mesmo capítulo falando do mesmo
# assunto não é descoberta nenhuma — é o capítulo. O que o desenho celebra é
# "sete notas suas, em quatro livros diferentes, usam as mesmas palavras", e é a
# travessia que faz isso ser notícia.
MINIMO_DE_LIVROS = 2

# TETO DE NOTAS COMPARADAS. O agrupamento é O(n²) em intersecções de conjunto:
# com duzentas notas são vinte mil, que o Python faz sem suar; com dez mil seriam
# cinquenta milhões, e a página de Estudos passaria a demorar sem ninguém saber
# por quê. As mais recentes são as que interessam, e o corte é dito na resposta.
TETO_DE_NOTAS = 400


def agrupar(notas: list) -> list[dict]:
    """Grupos de notas que dividem assunto, atravessando livros.

    NÃO É A MESMA PERGUNTA DE `sugerir`. Aquela é "o que se parece com ESTA
    nota", e vive na página de uma nota. Esta é "que assuntos apareceram no meu
    acervo sem eu ter organizado nada", e vive nos Estudos — é a promessa da
    Apresentação, "o que você marcou em livros diferentes sobre o mesmo assunto
    se encontra, sem você organizar pasta nenhuma".

    O ALGORITMO É UNIÃO DE CONJUNTOS, e está aqui inteiro de propósito: cada
    par de notas que divide `PROXIMAS` palavras entra no mesmo grupo, por
    transitividade. Isso significa que A e C podem acabar juntas sem dividirem
    palavra nenhuma, desde que as duas dividam com B — e isso é o que se quer de
    um assunto, que não é uma frase repetida mas um fio.

    A limitação é a mesma do resto do serviço, e continua honesta: é interseção
    de palavras, não busca semântica. Duas notas que dizem a mesma coisa com
    palavras diferentes não se encontram.
    """
    usadas = list(notas)[:TETO_DE_NOTAS]
    if len(usadas) < MINIMO_DO_GRUPO:
        return []

    palavras = {n.id: _limpar(_texto_da_nota(n)) for n in usadas}

    # União de conjuntos, sem classe: `pai[x]` é o representante do grupo de x.
    pai = {n.id: n.id for n in usadas}

    def raiz(x):
        while pai[x] != x:
            pai[x] = pai[pai[x]]
            x = pai[x]
        return x

    def unir(a, b):
        ra, rb = raiz(a), raiz(b)
        if ra != rb:
            pai[rb] = ra

    # As palavras que sustentam cada par ficam guardadas: o grupo mostra as que
    # mais se repetem, e sem elas a lista seria o produto afirmando um assunto
    # sem dizer de onde o tirou.
    contagem: dict = {}
    for i, a in enumerate(usadas):
        de_a = palavras[a.id]
        if not de_a:
            continue
        for b in usadas[i + 1:]:
            comuns = set(de_a) & set(palavras[b.id])
            if len(comuns) < PROXIMAS:
                continue
            unir(a.id, b.id)
            for c in comuns:
                contagem[c] = contagem.get(c, 0) + 1

    grupos: dict = {}
    for n in usadas:
        grupos.setdefault(raiz(n.id), []).append(n)

    fora = []
    for membros in grupos.values():
        if len(membros) < MINIMO_DO_GRUPO:
            continue
        livros = {m.job_id for m in membros if m.job_id is not None}
        # Nota escrita solta não tem livro. Ela pode ENTRAR num grupo — o
        # assunto é o mesmo —, mas não conta para a travessia, que é sobre o
        # acervo.
        if len(livros) < MINIMO_DE_LIVROS:
            continue

        # As palavras do grupo: as que aparecem em mais de um membro, das mais
        # comuns para as menos.
        do_grupo: dict = {}
        for m in membros:
            for chave, forma in palavras[m.id].items():
                do_grupo.setdefault(chave, [0, forma])
                do_grupo[chave][0] += 1
        comuns = sorted(
            ((forma, quantas) for quantas, forma in do_grupo.values() if quantas > 1),
            key=lambda p: (-p[1], p[0]),
        )

        fora.append({
            "notas": [
                {
                    "id": m.id,
                    "trecho": m.trecho,
                    "comentario": m.comentario,
                    "cor": m.cor,
                    "origem": getattr(m, "origem", "") or "",
                    "job_id": m.job_id,
                }
                for m in membros
            ],
            "quantas": len(membros),
            "livros": len(livros),
            "palavras": [forma for forma, _ in comuns[:8]],
        })

    # O maior primeiro: um grupo de sete notas em quatro livros é mais notícia
    # que um de três em dois.
    fora.sort(key=lambda g: (-g["quantas"], -g["livros"]))
    return fora
