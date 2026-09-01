"""A prévia de um link posto no Canvas — nó `895:6938`.

O desenho traz, entre os cartões do Canvas, um com miniatura de página externa.
Para montá-lo é preciso IR ATÉ O ENDEREÇO e ler o que ele diz de si — título,
descrição e imagem de capa, nas etiquetas Open Graph. Não há como fugir disso:
essa informação não está no Mekora, está no site.

A tela de Privacidade diz isso com todas as letras, e é por isso que ela foi
reescrita antes desta função existir.

O QUE ESTE ARQUIVO DEFENDE
==========================
Uma rota que busca um endereço escolhido por quem chama é a definição de SSRF:
o servidor vira um navegador do atacante, dentro da rede onde ele está. Numa
máquina de nuvem isso alcança o serviço de metadados e as credenciais que ele
entrega; numa máquina local, alcança tudo o que está atrás do roteador.

As defesas, e o que cada uma impede:

  **Só http e https.** `file:///etc/passwd`, `gopher://` e `ftp://` não passam.
  Sem isto a rota lê o disco do servidor.

  **O ENDEREÇO É RESOLVIDO E O IP CONFERIDO**, e não o nome. Conferir o nome
  deixa passar `localhost.meu-dominio.com` — que resolve para 127.0.0.1 — e
  qualquer DNS que aponte para dentro. É a conferência que importa.

  **Cada salto de redirecionamento é conferido de novo.** Um endereço público
  que responde 302 para `http://169.254.169.254/` é o caminho mais curto para as
  credenciais da máquina, e seguir redirecionamento cego anula todo o resto.

  **Teto de tamanho e de tempo.** Sem eles, um endereço que responde devagar e
  para sempre segura uma conexão do servidor por pedido.

O que NÃO se faz aqui: guardar a página, guardar o corpo, ou seguir qualquer
coisa que não seja o `Location` de um 3xx.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from html import unescape
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx

# Tetos. São pequenos de propósito: uma prévia é título, descrição e uma imagem,
# e tudo isso cabe no começo do documento.
SEGUNDOS = 5.0
BYTES = 512 * 1024
SALTOS = 3

# O que o Mekora diz ser ao bater na porta de outro site. Dizer a verdade é o
# mínimo: o dono do site precisa poder saber quem o visitou e bloquear se
# quiser.
#
# SEM ACENTO, e é a única linha deste repositório em que isso é correto: um
# cabeçalho HTTP é latin-1, e "prévia" derrubava o pedido inteiro com
# `UnicodeEncodeError` antes de sair da máquina. Não é texto de tela — é
# protocolo.
AGENTE = "Mekora/1.0 (+link preview requested by a Mekora user)"


class PreviaRecusada(Exception):
    """O endereço não pode ser buscado, e a mensagem diz por quê."""


def _ip_publico(host: str) -> None:
    """Recusa endereço que aponte para dentro.

    Resolve o nome e confere TODOS os IPs devolvidos: um nome pode responder com
    um endereço público e um privado, e conferir só o primeiro deixa passar o
    segundo.
    """
    try:
        achados = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise PreviaRecusada("Esse endereço não existe.")

    for familia, *_, sockaddr in achados:
        ip = ipaddress.ip_address(sockaddr[0])
        if (
            ip.is_private or ip.is_loopback or ip.is_link_local
            or ip.is_reserved or ip.is_multicast or ip.is_unspecified
        ):
            raise PreviaRecusada("Esse endereço aponta para dentro da rede, e não para a internet.")


def _conferir(endereco: str) -> str:
    partes = urlparse(endereco)
    if partes.scheme not in ("http", "https"):
        raise PreviaRecusada("Só endereços http e https.")
    if not partes.hostname:
        raise PreviaRecusada("Esse endereço não tem servidor.")
    _ip_publico(partes.hostname)
    return endereco


_META = re.compile(
    r"<meta\s[^>]*?(?:property|name)\s*=\s*[\"']([^\"']+)[\"'][^>]*?content\s*=\s*[\"']([^\"']*)[\"']"
    r"|<meta\s[^>]*?content\s*=\s*[\"']([^\"']*)[\"'][^>]*?(?:property|name)\s*=\s*[\"']([^\"']+)[\"']",
    re.I | re.S,
)
_TITULO = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def _ler(html: str, base: str) -> dict:
    """Título, descrição e imagem. Nada mais sai da página.

    Expressão regular e não um analisador de HTML: o que se procura são três
    etiquetas no `<head>`, e trazer uma dependência nova para isso — que depois
    precisa ser mantida e atualizada — não se paga. O corpo é descartado.
    """
    etiquetas = {}
    for a, b, c, d in _META.findall(html):
        nome, valor = (a, b) if a else (d, c)
        etiquetas.setdefault(nome.strip().lower(), unescape(valor).strip())

    titulo = etiquetas.get("og:title") or etiquetas.get("twitter:title") or ""
    if not titulo:
        m = _TITULO.search(html)
        titulo = unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""

    imagem = etiquetas.get("og:image") or etiquetas.get("twitter:image") or ""
    if imagem:
        imagem = urljoin(base, imagem)
        # A imagem também é um endereço vindo de fora, e a tela vai carregá-la:
        # o mesmo filtro vale para ela.
        try:
            _conferir(imagem)
        except PreviaRecusada:
            imagem = ""

    return {
        "endereco": base,
        "titulo": titulo[:300],
        "descricao": (
            etiquetas.get("og:description")
            or etiquetas.get("twitter:description")
            or etiquetas.get("description")
            or ""
        )[:600],
        "imagem": imagem,
        "site": etiquetas.get("og:site_name", "")[:120] or urlparse(base).hostname or "",
    }


def buscar(endereco: str) -> dict:
    """Vai até o endereço e volta com a prévia. Levanta `PreviaRecusada`."""
    atual = _conferir(endereco.strip())

    with httpx.Client(
        timeout=SEGUNDOS,
        follow_redirects=False,
        headers={"User-Agent": AGENTE, "Accept": "text/html,application/xhtml+xml"},
    ) as cliente:
        for _ in range(SALTOS + 1):
            try:
                r = cliente.get(atual)
            except httpx.HTTPError:
                raise PreviaRecusada("Esse endereço não respondeu.")

            if r.status_code in (301, 302, 303, 307, 308):
                destino = r.headers.get("location")
                if not destino:
                    raise PreviaRecusada("Esse endereço redirecionou para lugar nenhum.")
                # CONFERE DE NOVO A CADA SALTO: um endereço público que redireciona
                # para dentro da rede é o caminho mais curto para o que esta
                # função existe para proteger.
                atual = _conferir(urljoin(atual, destino))
                continue

            if r.status_code >= 400:
                raise PreviaRecusada(f"Esse endereço respondeu {r.status_code}.")

            tipo = r.headers.get("content-type", "")
            if "html" not in tipo:
                # Não é página: não há prévia a montar, e o endereço continua
                # sendo um link válido na nota.
                raise PreviaRecusada("Esse endereço não é uma página.")

            return _ler(r.content[:BYTES].decode(r.encoding or "utf-8", errors="replace"), atual)

    raise PreviaRecusada("Esse endereço redirecionou vezes demais.")
