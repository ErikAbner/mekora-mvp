#!/usr/bin/env python3
"""Prova a geração do EPUB web num arquivo montado aqui.

Não basta rodar e ver que não quebrou: o que importa é se o EPUB resultante
ABRE, se as referências seguiram os arquivos, e se nenhuma imagem ficou maior.
Um EPUB com todas as figuras quebradas passa em qualquer teste que só olhe o
código de saída — o navegador não reclama, só não desenha.
"""
import sys, zipfile, re
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from PIL import Image, ImageDraw
from app.services.epub_web_service import gerar_epub_web

DESTINO = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/prova-epub")
DESTINO.mkdir(parents=True, exist_ok=True)


def imagem(modo, tamanho, fmt, ruido=True):
    """Foto sintética: ruído comprime mal, e é o caso que interessa medir."""
    im = Image.new(modo, tamanho, (240, 240, 240) if modo == "RGB" else (240, 240, 240, 255))
    d = ImageDraw.Draw(im)
    if ruido:
        import random
        random.seed(7)
        for _ in range(tamanho[0] * tamanho[1] // 40):
            x, y = random.randrange(tamanho[0]), random.randrange(tamanho[1])
            d.point((x, y), fill=(random.randrange(256), random.randrange(256), random.randrange(256)))
    else:
        for i in range(0, tamanho[0], 12):
            d.line([(i, 0), (i, tamanho[1])], fill=(0, 0, 0), width=2)
    b = BytesIO()
    im.save(b, format=fmt)
    return b.getvalue()


livro = DESTINO / "livro.epub"
with zipfile.ZipFile(livro, "w") as z:
    z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
    z.writestr("META-INF/container.xml",
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    z.writestr("OEBPS/images/foto.jpg", imagem("RGB", (1600, 700), "JPEG"))
    z.writestr("OEBPS/images/desenho.png", imagem("RGBA", (900, 600), "PNG", ruido=False))
    z.writestr("OEBPS/images/pequena.png", imagem("RGB", (300, 200), "PNG", ruido=False))
    z.writestr("OEBPS/images/vetor.svg", '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')
    z.writestr("OEBPS/content.opf",
        '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest>'
        '<item id="f" href="images/foto.jpg" media-type="image/jpeg"/>'
        '<item id="d" href="images/desenho.png" media-type="image/png"/>'
        '<item id="p" href="images/pequena.png" media-type="image/png"/>'
        '<item id="v" href="images/vetor.svg" media-type="image/svg+xml"/>'
        '<item id="c" href="cap1.xhtml" media-type="application/xhtml+xml"/>'
        '</manifest><spine><itemref idref="c"/></spine></package>')
    z.writestr("OEBPS/cap1.xhtml",
        '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>'
        '<p>Texto.</p><img src="images/foto.jpg" alt=""/><img src="images/desenho.png" alt=""/>'
        '<img src="images/pequena.png" alt=""/><img src="images/vetor.svg" alt=""/></body></html>')

antes = livro.stat().st_size
r = gerar_epub_web(livro)
falhas = []

print(f"  origem: {antes/1024:.1f} KB")
if r.caminho is None:
    falhas.append("nao gerou o arquivo web")
else:
    depois = r.caminho.stat().st_size
    print(f"  web:    {depois/1024:.1f} KB  ({(1-depois/antes)*100:+.0f}%)")
    print(f"  imagens: {r.imagens} · convertidas {r.convertidas} · mantidas {r.mantidas}")
    print(f"  so as imagens: {r.bytes_antes/1024:.1f} KB -> {r.bytes_depois/1024:.1f} KB ({r.economia*100:.0f}% menor)")

    with zipfile.ZipFile(r.caminho) as z:
        nomes = z.namelist()
        # 1 · o mimetype e o primeiro e nao comprimido
        info = z.infolist()[0]
        if info.filename != "mimetype" or info.compress_type != zipfile.ZIP_STORED:
            falhas.append("mimetype nao e o primeiro item sem compressao")
        # 2 · o SVG sobreviveu
        if "OEBPS/images/vetor.svg" not in nomes:
            falhas.append("o SVG foi tocado")
        # 3 · TODA referencia aponta para arquivo que existe
        xhtml = z.read("OEBPS/cap1.xhtml").decode()
        for src in re.findall(r'src="([^"]+)"', xhtml):
            alvo = "OEBPS/" + src.replace("../", "")
            if alvo not in nomes:
                falhas.append(f"referencia quebrada no xhtml: {src}")
        # 4 · o manifesto declara webp para todo item .webp
        opf = z.read("OEBPS/content.opf").decode()
        for href, tipo in re.findall(r'href="([^"]+)"\s+media-type="([^"]+)"', opf):
            if href.endswith(".webp") and tipo != "image/webp":
                falhas.append(f"manifesto declara {tipo} para {href}")
            if not href.endswith((".webp", ".svg", ".xhtml")) and href.endswith((".png", ".jpg")):
                if "OEBPS/" + href not in nomes:
                    falhas.append(f"manifesto aponta para arquivo que nao existe: {href}")
        # 5 · nenhuma imagem ficou maior
        with zipfile.ZipFile(livro) as orig:
            for n in nomes:
                if not n.endswith(".webp"):
                    continue
                for cand in (".jpg", ".png"):
                    velho = n.replace(".webp", cand)
                    if velho in orig.namelist():
                        if z.getinfo(n).file_size > orig.getinfo(velho).file_size:
                            falhas.append(f"{n} ficou MAIOR que {velho}")

print()
for f in falhas:
    print("  FALHA:", f)
print("  tudo passou." if not falhas else f"  {len(falhas)} falha(s)")
sys.exit(1 if falhas else 0)
