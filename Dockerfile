# --------------------------------------------------------------------------- #
# Stage 1: Build do frontend
# --------------------------------------------------------------------------- #
FROM node:20-slim AS frontend-build

WORKDIR /app/legado
COPY legado/package*.json ./
RUN npm ci --quiet
COPY legado/ .
RUN npm run build

# --------------------------------------------------------------------------- #
# Stage 2: Imagem de produção
# --------------------------------------------------------------------------- #
FROM python:3.11-slim

# Dependências do sistema: Tesseract, Ghostscript e utilitários base
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    xz-utils \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-por \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Calibre via instalador oficial (suporte a linux/amd64 e linux/arm64)
RUN wget -nv -O /tmp/calibre-install.sh https://download.calibre-ebook.com/linux-installer.sh \
    && sh /tmp/calibre-install.sh \
    && rm /tmp/calibre-install.sh

WORKDIR /app

# Código do backend
COPY backend/ backend/
COPY pyproject.toml .

# Frontend já compilado
COPY --from=frontend-build /app/legado/dist legado/dist

# Dependências Python
RUN pip install --no-cache-dir \
    "fastapi>=0.110.0" \
    "uvicorn[standard]>=0.27.0" \
    "python-multipart>=0.0.9" \
    "sqlalchemy>=2.0.0" \
    "pydantic>=2.0.0" \
    "pydantic-settings>=2.0.0" \
    "python-dotenv>=1.0.0" \
    "pymupdf>=1.24.0" \
    "aiofiles>=23.0.0" \
    "ocrmypdf>=16.0.0"

# Diretórios de storage (sobrescritos pelo volume em runtime)
RUN mkdir -p storage/input storage/output storage/temp storage/covers storage/logs

VOLUME /app/storage
EXPOSE 8000

# Variável de ambiente para origens CORS adicionais (opcional)
ENV ALLOWED_ORIGINS=""

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
