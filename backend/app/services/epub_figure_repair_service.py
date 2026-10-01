"""Repara uma cadeia estrutural específica de ilustrações deslocadas em EPUB.

Alguns exportadores deixam uma figura sem legenda no fim de uma seção e, mais
adiante, uma ``figcaption`` sem imagem. Entre as duas, cada legenda passa a
apontar para a imagem da explicação seguinte. O leitor não tem como corrigir
isso ordenando nomes de arquivo: ele já está obedecendo ao XHTML defeituoso.

A correção abaixo é deliberadamente conservadora. Ela só atua quando encontra:

* uma figura final com legenda, mas sem imagem;
* antes dela, uma cadeia de figuras com exatamente uma imagem e uma legenda;
* imediatamente antes da cadeia, uma figura com exatamente uma imagem e sem
  texto nem legenda.

Nesse formato há uma imagem a mais no começo e uma a menos no fim. A primeira
figura é removida e cada referência avança uma posição. EPUBs bem formados não
atendem a esse desenho e permanecem byte a byte como chegaram.
"""

from __future__ import annotations

import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET


@dataclass(frozen=True)
class FigureRepairResult:
    repaired_chains: int = 0
    shifted_images: int = 0


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _children(element: ET.Element, name: str) -> list[ET.Element]:
    return [item for item in element.iter() if _local(item.tag) == name]


def _has_meaningful_text(element: ET.Element) -> bool:
    pieces: list[str] = []
    if element.text:
        pieces.append(element.text)
    for child in element:
        if child.tail:
            pieces.append(child.tail)
    return bool("".join(pieces).strip())


def _figure_shape(figure: ET.Element) -> tuple[list[ET.Element], list[ET.Element]]:
    return _children(figure, "img"), _children(figure, "figcaption")


def repair_displaced_figures(
    epub: Path,
    *,
    donor_image_name: str | None = None,
) -> FigureRepairResult:
    """Repara cadeias inequivocamente deslocadas e substitui o EPUB de modo atômico."""
    if not epub.exists():
        return FigureRepairResult()

    with zipfile.ZipFile(epub) as source:
        names = source.namelist()
        documents: dict[str, tuple[ET.ElementTree, ET.Element]] = {}
        figures: list[tuple[str, ET.Element]] = []

        for name in names:
            if Path(name).suffix.lower() not in {".xhtml", ".html", ".htm"}:
                continue
            try:
                root = ET.fromstring(source.read(name))
            except ET.ParseError:
                continue
            tree = ET.ElementTree(root)
            documents[name] = (tree, root)
            figures.extend((name, node) for node in root.iter() if _local(node.tag) == "figure")

        changed_documents: set[str] = set()
        repaired = 0
        shifted = 0
        consumed: set[int] = set()

        # Quando a origem já passou por um conversor, várias figuras vizinhas
        # podem ter virado células de uma tabela. Para uma correção confirmada
        # pelo conteúdo, o nome da primeira imagem permite seguir a ordem real
        # dos nós sem depender do invólucro que o exportador escolheu.
        if donor_image_name is not None:
            events: list[tuple[str, str, ET.Element]] = []
            for name, (_, root) in documents.items():
                for node in root.iter():
                    kind = _local(node.tag)
                    if kind == "img":
                        events.append((name, "image", node))
                    elif kind == "figure":
                        images, captions = _figure_shape(node)
                        if not images and len(captions) == 1:
                            events.append((name, "target", node))

            donor_at = next(
                (
                    index
                    for index, (_, kind, node) in enumerate(events)
                    if kind == "image"
                    and Path(node.attrib.get("src", "")).name == donor_image_name
                ),
                None,
            )
            target_at = next(
                (
                    index
                    for index, (_, kind, _) in enumerate(events)
                    if donor_at is not None and index > donor_at and kind == "target"
                ),
                None,
            )
            if donor_at is not None and target_at is not None:
                donor_name, _, donor_image = events[donor_at]
                target_name, _, target = events[target_at]
                middle = [
                    (name, node)
                    for name, kind, node in events[donor_at + 1 : target_at]
                    if kind == "image"
                ]
                if middle:
                    references = [dict(donor_image.attrib)] + [dict(node.attrib) for _, node in middle]
                    new_image = ET.Element(donor_image.tag, references[-1])
                    target.insert(0, new_image)
                    destinations = [node for _, node in middle] + [new_image]
                    for destination, attributes in zip(destinations, references):
                        destination.attrib.clear()
                        destination.attrib.update(attributes)

                    donor_root = documents[donor_name][1]
                    parents = {child: parent for parent in donor_root.iter() for child in parent}
                    wrapper = donor_image
                    parent = parents.get(wrapper)
                    # Retira também a célula/figura vazia que sobraria. Só
                    # sobe por invólucros sem texto e com esta única imagem.
                    while parent is not None and _local(parent.tag) in {"figure", "td", "p"}:
                        if len(_children(parent, "img")) != 1 or _has_meaningful_text(parent):
                            break
                        wrapper = parent
                        parent = parents.get(wrapper)
                    if parent is not None:
                        parent.remove(wrapper)
                        changed_documents.update([donor_name, target_name, *(name for name, _ in middle)])
                        repaired = 1
                        shifted = len(destinations)

        if repaired:
            figures = []

        for target_index, (target_name, target) in enumerate(figures):
            target_images, target_captions = _figure_shape(target)
            if target_images or len(target_captions) != 1:
                continue

            chain: list[tuple[str, ET.Element, ET.Element]] = []
            cursor = target_index - 1
            while cursor >= 0:
                name, figure = figures[cursor]
                images, captions = _figure_shape(figure)
                if len(images) == 1 and (
                    len(captions) == 1 or donor_image_name is not None
                ):
                    if donor_image_name is not None and Path(images[0].attrib.get("src", "")).name == donor_image_name:
                        break
                    chain.append((name, figure, images[0]))
                    cursor -= 1
                    continue
                break

            # Uma única troca pode ser coincidência; uma cadeia longa mais a
            # ponta vazia é a assinatura do exportador defeituoso observado.
            if len(chain) < 2 or cursor < 0 or cursor in consumed:
                continue

            donor_name, donor = figures[cursor]
            donor_images, donor_captions = _figure_shape(donor)
            if (
                len(donor_images) != 1
                or donor_captions
                or _has_meaningful_text(donor)
                or (
                    donor_image_name is not None
                    and Path(donor_images[0].attrib.get("src", "")).name != donor_image_name
                )
            ):
                continue

            ordered = list(reversed(chain))
            references = [dict(donor_images[0].attrib)] + [dict(image.attrib) for _, _, image in ordered]
            destinations = [image for _, _, image in ordered]

            # A última imagem da cadeia preenche a figura que tinha somente a
            # legenda. Clonar a tag mantém o namespace usado no documento.
            new_image = ET.Element(donor_images[0].tag, references[-1])
            target.insert(0, new_image)
            destinations.append(new_image)

            for destination, attributes in zip(destinations, references):
                destination.attrib.clear()
                destination.attrib.update(attributes)

            donor_root = documents[donor_name][1]
            parent = next((node for node in donor_root.iter() if donor in list(node)), None)
            if parent is None:
                continue
            parent.remove(donor)

            changed_documents.update([donor_name, target_name, *(name for name, _, _ in ordered)])
            consumed.add(cursor)
            repaired += 1
            shifted += len(destinations)

        if not repaired:
            return FigureRepairResult()

        with tempfile.NamedTemporaryFile(dir=epub.parent, suffix=".epub", delete=False) as handle:
            temporary = Path(handle.name)
        try:
            with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as output:
                for item in source.infolist():
                    if item.filename in changed_documents:
                        tree = documents[item.filename][0]
                        payload = ET.tostring(tree.getroot(), encoding="utf-8", xml_declaration=True)
                        output.writestr(item, payload)
                    else:
                        output.writestr(item, source.read(item.filename))
            temporary.replace(epub)
        finally:
            temporary.unlink(missing_ok=True)

    return FigureRepairResult(repaired_chains=repaired, shifted_images=shifted)
