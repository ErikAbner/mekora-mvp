"""A capa do livro — um lugar só que decide onde ela mora e se ela existe.

POR QUE ESTE ARQUIVO EXISTE
===========================
A capa era emitida em CINCO lugares — a Estante (`api/jobs.py`), a busca
(`api/busca.py`), os Estudos (`api/estudos.py`), o Canvas (`api/canvas.py`) e as
miniaturas da análise (`services/pdf_service.py`) — e nenhum dos cinco
perguntava se o arquivo estava lá. Todos montavam a URL a partir de
`page_count` e do token, e a tela confiava.

O resultado medido em 04/09, no banco real: 32 de 37 trabalhos com `cover_url`
não-nulo e DOIS diretórios em `storage/temp`. Trinta e duas molduras quebradas
em cinco superfícies, e o `.capa-vazia` — que existe no CSS desde sempre — nunca
foi usado, porque `cover_url` nunca era nulo.

E o buraco embaixo do buraco: a capa morava em `storage/temp/{id}/page_N.png`, e
o `cleanup_old_jobs` faz `shutil.rmtree(temp_dir)` depois de `retention_days`.
A pasta de saída fica de propósito — está escrito lá que apagá-la "apagaria o
EPUB da estante de alguém trinta dias depois". A capa não teve a mesma
consideração: ela ficou na pasta que a política existe para apagar, enquanto a
estante que a mostra é permanente.

`STORAGE_COVERS` estava declarado no `core/config.py` e criado no boot desde
sempre, e nenhuma linha do repositório escrevia ou lia dentro dele. A intenção
existia; o fio nunca foi ligado.

AS DUAS REGRAS
==============
1. A capa é PROMOVIDA para `storage/covers/{id}/capa.png` assim que existe — no
   fim da análise, e de novo quando a pessoa escolhe outra página. Fora do
   alcance da limpeza por idade, junto do EPUB que ela ilustra.

2. Ninguém emite URL de capa sem conferir o arquivo. Sem arquivo, `None`, e a
   tela cai sozinha no `.capa-vazia`. `None` e não uma URL que dá 404: a
   diferença é a tela poder dizer "sem capa" em vez de mostrar imagem quebrada.

O `_bytes_de`, no `api/jobs.py`, já seguia a segunda regra para o tamanho do
EPUB — "None e não zero: zero seria o produto afirmando que o EPUB é vazio". O
mesmo raciocínio, aplicado à capa, é este arquivo.
"""

from __future__ import annotations

import io
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image

from app.core.config import STORAGE_COVERS, STORAGE_TEMP

NOME = "capa.png"
ORIGINAL = "original.png"


def arquivo(job_id: int) -> Path:
    """Onde a capa promovida mora. Por id, como o resto do storage."""
    return STORAGE_COVERS / str(job_id) / NOME


def original(job_id: int) -> Path:
    return STORAGE_COVERS / str(job_id) / ORIGINAL


def _capa_embutida(job) -> Path | None:
    """Extrai a capa declarada pelo EPUB, sem confundir a primeira página com ela."""
    destino = original(job.id)
    if destino.exists():
        return destino
    entrada = Path(getattr(job, "input_path", "") or "")
    if entrada.suffix.lower() != ".epub" or not entrada.exists():
        return None
    try:
        with zipfile.ZipFile(entrada) as zf:
            container = ElementTree.fromstring(zf.read("META-INF/container.xml"))
            raiz = next(e.attrib["full-path"] for e in container.iter() if e.tag.endswith("rootfile"))
            opf = ElementTree.fromstring(zf.read(raiz))
            itens = {e.attrib.get("id"): e for e in opf.iter() if e.tag.endswith("item")}
            item = next((e for e in itens.values() if "cover-image" in e.attrib.get("properties", "").split()), None)
            if item is None:
                capa_id = next((e.attrib.get("content") for e in opf.iter() if e.tag.endswith("meta") and e.attrib.get("name") == "cover"), None)
                item = itens.get(capa_id)
            if item is None:
                return None
            caminho = str((Path(raiz).parent / item.attrib["href"]).as_posix())
            dados = zf.read(caminho)
        with Image.open(io.BytesIO(dados)) as imagem:
            imagem.load()
            destino.parent.mkdir(parents=True, exist_ok=True)
            imagem.convert("RGB").save(destino, "PNG", optimize=True)
        return destino
    except (OSError, KeyError, StopIteration, ValueError, zipfile.BadZipFile, ElementTree.ParseError):
        return None


def _origem(job) -> Path | None:
    """A miniatura de onde a capa sai, se ela estiver em disco.

    Ordem: a página que a pessoa escolheu, depois a primeira. `cover_path` é
    consultado primeiro porque é o que a conversão manda para o Calibre — se ele
    aponta para um arquivo vivo, é essa a capa que o livro já tem.
    """
    escolha = getattr(job, "selected_cover_page", None)
    # -1 é a escolha explícita de não usar imagem; -2 é a capa do EPUB.
    if escolha == -1:
        return None
    if escolha in (None, -2):
        embutida = _capa_embutida(job)
        if embutida is not None:
            return embutida
    if getattr(job, "cover_path", None):
        p = Path(job.cover_path)
        if p.exists() and p != arquivo(job.id):
            return p
    pagina = escolha
    if pagina is None:
        pagina = 0
    if pagina < 0:
        return None
    p = STORAGE_TEMP / str(job.id) / f"page_{pagina}.png"
    return p if p.exists() else None


def promover(job) -> Path | None:
    """Copia a capa para o permanente. Devolve o destino, ou `None` sem origem.

    Idempotente: chamada de novo com a mesma origem, reescreve o mesmo arquivo.
    Ela é chamada no fim da análise e de novo quando a capa é trocada, e a
    segunda chamada TEM de sobrescrever — senão trocar de capa não muda nada.

    Não levanta. Uma capa que não copiou não pode derrubar uma conversão que
    deu certo; ela vira ausência de capa, que é um estado que a tela sabe
    desenhar.
    """
    origem = _origem(job)
    if origem is None:
        if getattr(job, "selected_cover_page", None) == -1:
            arquivo(job.id).unlink(missing_ok=True)
        return None
    destino = arquivo(job.id)
    try:
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origem, destino)
    except OSError:
        return None
    return destino


def url(job) -> str | None:
    """A URL da capa, ou `None` quando não há arquivo. O ÚNICO emissor.

    Pelo TOKEN e não pelo número: a capa é vista durante a análise, que acontece
    antes de existir conta, e pelo número ela só abriria para um dono que ainda
    não há (DEC-0039 §5). O mesmo motivo que o `get_thumbnail_urls` já tinha
    escrito.
    """
    if not job.token_publico:
        return None
    if not arquivo(job.id).exists() and promover(job) is None:
        return None
    return f"/storage/covers/{job.token_publico}/{NOME}"


def url_original(job) -> str | None:
    if not job.token_publico or _capa_embutida(job) is None:
        return None
    return f"/storage/covers/{job.token_publico}/{ORIGINAL}"


def origem_atual(job) -> str:
    escolha = getattr(job, "selected_cover_page", None)
    if escolha == -1:
        return "generated"
    if escolha == -2 or (escolha is None and _capa_embutida(job) is not None):
        return "embedded"
    return "page" if escolha is not None else "auto"
