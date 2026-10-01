# O Mekora converte documentos, e converter documento é trabalho que acontece
# FORA do Python: OCR é o tesseract, PDF é o ghostscript e o qpdf, arquivo
# comprimido de quadrinho é o unar. `pip install` não traz nada disso, e a falta
# só aparece quando alguém sobe um PDF escaneado no ar — que é tarde.
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# tesseract-ocr-por vem junto com o eng de propósito: o produto é de leitura em
# português, e o tesseract sem o idioma instalado não falha — ele reconhece mal,
# em silêncio, e devolve texto ruim que parece resultado.
# O calibre é o maior item desta lista e não é opcional: `ebook-convert` é o que
# transforma PDF, DOCX e o resto em EPUB, e `convert_service.py` o chama sem
# nenhum caminho alternativo. Sem ele o produto sobe, aceita o arquivo, e falha
# na conversão — depois de a pessoa já ter confiado o documento.
#
# `--no-install-recommends` corta o que vem de carona com ele (leitor, editor,
# servidor de conteúdo) e que nada aqui usa.
RUN apt-get update && apt-get install -y --no-install-recommends \
      calibre \
      tesseract-ocr tesseract-ocr-por tesseract-ocr-eng \
      ghostscript qpdf unpaper pngquant \
      unar \
      fonts-dejavu-core \
      curl \
    && rm -rf /var/lib/apt/lists/*

# O calibre carrega Qt e procura um servidor gráfico ao iniciar. Não há nenhum
# num container, e sem esta linha o `ebook-convert` morre com um erro sobre
# plugin de plataforma — que não diz nada sobre conversão de livro.
ENV QT_QPA_PLATFORM=offscreen

WORKDIR /app

# As dependências entram antes do código para que trocar uma linha de Python não
# obrigue a reinstalar tudo de novo. É a diferença entre um deploy de segundos e
# um de minutos, e ela conta em toda correção com pressa.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY contrato/ /app/contrato/
COPY scripts/conferir-ferramentas.py /app/scripts/

# A imagem NÃO constrói se faltar ferramenta. Uma falta descoberta aqui custa um
# build; descoberta em produção, custa o primeiro documento de alguém.
RUN python3 /app/scripts/conferir-ferramentas.py

# Roda como gente, não como root. Se algum dos conversores for explorado por um
# arquivo malformado — e eles leem arquivo de estranho o dia inteiro —, o
# estrago fica dentro de uma conta sem poder nenhum.
RUN useradd --create-home --uid 10001 mekora \
    && mkdir -p /app/storage \
    && chown -R mekora:mekora /app
USER mekora

# Uma variavel decide onde TUDO fica: banco, entrada, saida, miniaturas,
# modelos. Antes o caminho vinha da posicao do arquivo de codigo, e com isso
# qualquer processo rodando este codigo escrevia no mesmo disco — inclusive um
# servidor de prova apontado para um banco descartavel.
ENV MEKORA_STORAGE=/app/storage \
    ARGOS_PACKAGES_DIR=/app/storage/models/argos-packages

VOLUME ["/app/storage"]
EXPOSE 8000

# A verificação bate numa rota que consulta o banco. Um processo vivo que não
# alcança o disco continua respondendo em porta aberta, e um `docker ps` verde
# nesse estado é pior que um container caído: ninguém vai olhar.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

WORKDIR /app/backend
# Um worker só, e não é economia: o banco é SQLite, que aceita um escritor por
# vez. Vários workers produziriam `database is locked` sob carga — o erro que só
# aparece quando o produto começa a ser usado de verdade.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
