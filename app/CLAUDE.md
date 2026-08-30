# Mekora — App operacional (Kindle Local Tool)

## O que é

Ferramenta local que prepara documentos para o Kindle: converte PDF em EPUB, detecta PDF escaneado, roda OCR, traduz, organiza metadados e envia por e-mail, com histórico e retry.

Estágio: ativo. Registro no Project OS: `~/Projeto-os/erik-project-os/projects/mekora.json`, repositório `operational_app`.

## Este repositório

- Papel: **implementação operacional**. É o produto que funciona, não protótipo.
- **Não confundir com** `~/mekora-canvas-motion` (interface de canvas e movimento) nem com `ErikAbner/mekora-experience` (exploração de experiência espacial). São três bases com histórias Git independentes; nenhuma é fork da outra.
- Stack: FastAPI + Python `>=3.11` no backend, React + Vite + TypeScript no frontend.
- Remoto: `ErikAbner/mekora-app` (privado), `main`.
- Depende de binários locais: Calibre, Tesseract, OCRmyPDF. O OCRmyPDF ficou fixado na linha 15.x por compatibilidade com Python 3.9; confirmar a versão atual antes de mexer em dependência.

## Comandos

```bash
./start.sh              # backend + frontend em desenvolvimento
./start.sh --prod       # build do frontend e um servidor único
```

Frontend em `:5173`, backend e docs da API em `:8000/docs`.

```bash
cd frontend && npm test         # vitest
cd frontend && npm run build    # tsc + vite build
```

Testes do backend ficam em `backend/tests`.

## Antes de alterar

1. Verificar se já existe alguém trabalhando aqui:

```bash
os status
```

Run ativo em Mekora significa que outra sessão pode estar editando estes arquivos. Duas sessões na mesma árvore se sobrescrevem sem aviso.

2. Abrir um run declarando escopo:

```bash
os start mekora feature "<título>" --executor "Claude Code" --scope "<o que entra, o que fica de fora, o que não deve ser tocado>"
```

Se `os` não existir, o alias é `node /Users/sipnm/Projeto-os/erik-project-os/bin/project-os.mjs`.

## Limites

- Não commitar nem dar push sem Erik pedir explicitamente.
- **Nunca** ler, copiar ou registrar valores de `.env`, credenciais SMTP, conteúdo do SQLite ou documentos pessoais em `storage/`.
- Kindle é tratado como somente leitura para inventário, exceto transferência deliberada de documentos pessoais.
- Nada de DRM, jailbreak ou extração de conteúdo protegido da Amazon. Livros da Amazon podem ser catalogados; o conteúdo não pode ser extraído nem enviado.
- Notas e destaques podem ser lidos de `My Clippings.txt`.
- Falha em um item não pode bloquear o lote inteiro.
- Não instalar dependência nova sem necessidade declarada no escopo do run.
- Evitar APIs pagas: o princípio do produto é local-first.

## Ao terminar

```bash
cd frontend && npm test
os close <run_id> --summary "..." --test "vitest: N passaram" --file "<arquivo>" --next "<próximo passo>"
```

Evidência é comando e resultado, não a afirmação de que funciona. Testes passando não autorizam commit nem deploy — quem aprova é Erik.
