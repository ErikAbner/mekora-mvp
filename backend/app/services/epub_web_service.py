"""Gera, ao lado do EPUB, uma versão com as imagens em WebP para ler no navegador.

POR QUE UM SEGUNDO ARQUIVO, E NÃO O MESMO
=========================================
O EPUB que a leitura abre é o MESMO que vai para o Kindle — e o Kindle não lê
WebP de forma confiável. Trocar as imagens no arquivo único deixaria a leitura
mais leve e poderia quebrar o envio, que é a promessa mais visível do produto.

Então são dois: `livro.epub` continua como está, com as imagens que o Calibre
produziu, e é ele que a Amazon recebe. `livro.web.epub` tem as mesmas páginas com
as imagens em WebP, e é ele que o navegador baixa.

O SEGUNDO NÃO CUSTA O DOBRO. Ele é quase todo o mesmo texto, e as imagens — que
são o peso — encolhem. Um EPUB ilustrado costuma sair menor que o original mesmo
somando os dois.

QUALIDADE
=========
`quality=82` com `method=6`: 82 é o ponto em que a perda deixa de ser visível em
fotografia, e `method=6` é o codificador lento, que gasta mais CPU para achar uma
codificação menor com a MESMA qualidade — o tempo aqui é de conversão, que já é
assíncrona, e o ganho é de rede, que é do usuário.

PNG COM TRANSPARÊNCIA VIRA WebP SEM PERDA. Ilustração de livro costuma ser
desenho de traço, e nela a compressão com perda produz sujeira em volta das
linhas, que é exatamente onde o olho vai. Foto vira WebP com perda; desenho, não.

O QUE NUNCA É TOCADO
====================
SVG, porque já é vetor e converter para WebP é perder resolução infinita. E
qualquer imagem que fique MAIOR em WebP: existe, acontece com PNG já otimizado, e
gravar um arquivo pior porque a etapa se chama "otimizar" seria trocar o objetivo
pelo nome dele.
"""

from __future__ import annotations

import logging
import shutil
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# O que vira WebP. SVG fica de fora por ser vetor.
CONVERSIVEIS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff"}

QUALIDADE = 82
METODO = 6


@dataclass
class Resultado:
    """O que a etapa fez, em número. Serve para o log e para o teste."""

    caminho: Optional[Path]
    imagens: int = 0
    convertidas: int = 0
    mantidas: int = 0
    bytes_antes: int = 0
    bytes_depois: int = 0

    @property
    def economia(self) -> float:
        if not self.bytes_antes:
            return 0.0
        return 1 - (self.bytes_depois / self.bytes_antes)


def _converter(bytes_originais: bytes, extensao: str) -> Optional[bytes]:
    """Devolve o WebP, ou None quando não vale a pena.

    None não é falha: é a resposta certa quando o resultado ficaria maior, e
    quando o arquivo não é imagem que o Pillow abra.
    """
    from PIL import Image  # importado aqui: o serviço carrega mesmo sem Pillow

    try:
        with Image.open(BytesIO(bytes_originais)) as im:
            # Animação não sobrevive à conversão quadro a quadro feita assim, e
            # um GIF animado que vira imagem parada perde o que ele era.
            if getattr(im, "is_animated", False):
                return None

            tem_alfa = im.mode in ("RGBA", "LA") or (
                im.mode == "P" and "transparency" in im.info
            )
            # Desenho de traço sofre com perda: a sujeira aparece justamente na
            # borda da linha, que é onde o olho está.
            sem_perda = extensao == ".png"

            saida = BytesIO()
            if sem_perda:
                im.save(saida, format="WEBP", lossless=True, method=METODO)
            else:
                if tem_alfa:
                    im.save(saida, format="WEBP", quality=QUALIDADE, method=METODO)
                else:
                    im.convert("RGB").save(
                        saida, format="WEBP", quality=QUALIDADE, method=METODO
                    )
            novo = saida.getvalue()
    except Exception as erro:  # imagem quebrada não derruba a conversão do livro
        logger.warning("imagem não convertida (%s): %s", extensao, erro)
        return None

    # MAIOR NÃO ENTRA. Gravar um arquivo pior porque a etapa se chama "otimizar"
    # seria trocar o objetivo pelo nome dele.
    return novo if len(novo) < len(bytes_originais) else None


def gerar_epub_web(epub: Path, destino: Optional[Path] = None) -> Resultado:
    """Escreve `<nome>.web.epub` com as imagens em WebP. Não altera a origem."""
    if not epub.exists():
        return Resultado(caminho=None)

    saida = destino or epub.with_suffix(".web.epub")

    try:
        with zipfile.ZipFile(epub) as origem:
            nomes = origem.namelist()
            # De caminho antigo para novo, para reescrever as referências.
            trocas: dict[str, str] = {}
            convertidas: dict[str, bytes] = {}
            r = Resultado(caminho=saida)

            for nome in nomes:
                ext = Path(nome).suffix.lower()
                if ext not in CONVERSIVEIS:
                    continue
                r.imagens += 1
                bruto = origem.read(nome)
                novo = _converter(bruto, ext)
                if novo is None:
                    r.mantidas += 1
                    continue
                r.convertidas += 1
                r.bytes_antes += len(bruto)
                r.bytes_depois += len(novo)
                destino_nome = str(Path(nome).with_suffix(".webp"))
                trocas[nome] = destino_nome
                convertidas[nome] = novo

            if not trocas:
                # Nada mudou: um segundo arquivo idêntico só ocuparia espaço.
                return Resultado(caminho=None, imagens=r.imagens, mantidas=r.mantidas)

            saida.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as novo_zip:
                # `mimetype` primeiro e SEM compressão: é o que a especificação do
                # EPUB exige, e um leitor rigoroso recusa o arquivo sem isso.
                if "mimetype" in nomes:
                    novo_zip.writestr(
                        zipfile.ZipInfo("mimetype"),
                        origem.read("mimetype"),
                        compress_type=zipfile.ZIP_STORED,
                    )

                for nome in nomes:
                    if nome == "mimetype":
                        continue
                    if nome in convertidas:
                        novo_zip.writestr(trocas[nome], convertidas[nome])
                        continue

                    dados = origem.read(nome)
                    ext = Path(nome).suffix.lower()
                    # AS REFERÊNCIAS PRECISAM SEGUIR O ARQUIVO. Trocar a imagem e
                    # deixar o `src` apontando para o nome antigo produz um EPUB
                    # que abre com todas as figuras quebradas — e o navegador não
                    # reclama, só não desenha.
                    if ext in (".xhtml", ".html", ".htm", ".opf", ".ncx", ".css", ".xml"):
                        texto = dados.decode("utf-8", errors="ignore")
                        for antigo, atual in trocas.items():
                            # Pelo nome do arquivo, e não pelo caminho inteiro: no
                            # XHTML ele aparece relativo ("../images/x.png"), e no
                            # OPF absoluto dentro do zip.
                            texto = texto.replace(antigo, atual)
                            texto = texto.replace(Path(antigo).name, Path(atual).name)
                        # O manifesto declara o tipo de cada item, e um
                        # `media-type` errado faz leitor rigoroso recusar.
                        if ext == ".opf":
                            for tipo in ("image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff"):
                                texto = texto.replace(
                                    f'{tipo}"', 'image/webp"'
                                ) if f'.webp" media-type="{tipo}"' in texto else texto
                            texto = _corrigir_tipos(texto)
                        dados = texto.encode("utf-8")

                    novo_zip.writestr(nome, dados)

            return r
    except zipfile.BadZipFile:
        logger.warning("EPUB ilegível, versão web não gerada: %s", epub)
        return Resultado(caminho=None)


def _corrigir_tipos(opf: str) -> str:
    """Todo item `.webp` declara `image/webp`, qualquer que fosse o tipo antes."""
    import re

    def trocar(m: "re.Match[str]") -> str:
        return m.group(0).replace(m.group(1), "image/webp")

    return re.sub(
        r'<item[^>]*\.webp"[^>]*media-type="([^"]+)"', trocar, opf
    )
