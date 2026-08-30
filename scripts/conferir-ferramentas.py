#!/usr/bin/env python3
"""Confere que os programas externos que o Mekora chama existem.

    python3 scripts/conferir-ferramentas.py

Boa parte do trabalho do Mekora não acontece em Python: converter é o
`ebook-convert` do Calibre, reconhecer texto é o `tesseract`, mexer em PDF é o
ghostscript e o qpdf. `pip install` não traz nenhum deles.

Sem esta conferência, a falta de um programa aparece assim: alguém sobe um
arquivo, espera a conversão, e recebe um erro sobre um executável que não existe
— num momento em que já confiou o documento ao produto. Rodando no build da
imagem, a mesma falta aparece antes de qualquer coisa subir.
"""

import shutil
import subprocess
import sys

# `preciso=False` é para o que melhora o resultado sem ser condição de
# funcionamento: sem eles o ocrmypdf trabalha, só que pior.
FERRAMENTAS = [
    ("ebook-convert", True, "Calibre — converte qualquer formato para EPUB. É o núcleo."),
    ("tesseract", True, "OCR de PDF escaneado e de quadrinho."),
    ("gs", True, "Ghostscript — o ocrmypdf o usa para reescrever o PDF."),
    ("qpdf", True, "Conserta e reestrutura PDF antes do OCR."),
    ("unar", False, "Abre CBR e RAR. Sem ele, quadrinho em RAR não entra."),
    ("pngquant", False, "Reduz o peso das imagens do OCR."),
    ("unpaper", False, "Endireita página torta antes do OCR."),
]


def idiomas_tesseract():
    try:
        saida = subprocess.run(
            ["tesseract", "--list-langs"], capture_output=True, text=True, timeout=20
        )
        return {l.strip() for l in (saida.stdout + saida.stderr).splitlines() if l.strip() and " " not in l.strip()}
    except Exception:
        return set()


def main():
    faltando = []
    print("\nFerramentas externas do Mekora\n")
    for nome, preciso, para_que in FERRAMENTAS:
        caminho = shutil.which(nome)
        if caminho:
            print(f"  ok        {nome:16} {caminho}")
        elif preciso:
            print(f"  FALTA     {nome:16} {para_que}")
            faltando.append(nome)
        else:
            print(f"  ausente   {nome:16} {para_que}")

    # O tesseract sem o idioma instalado NÃO falha: ele reconhece mal e devolve
    # texto ruim que passa por resultado. É a pior forma de faltar alguma coisa.
    if shutil.which("tesseract"):
        langs = idiomas_tesseract()
        for lang in ("por", "eng"):
            if lang in langs:
                print(f"  ok        idioma {lang}")
            else:
                print(f"  FALTA     idioma {lang} do tesseract — o OCR sai ruim em silêncio")
                faltando.append(f"tesseract-{lang}")

    if faltando:
        print("\nFaltam: " + ", ".join(faltando) + "\n")
        return 1
    print("\ntudo presente.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
