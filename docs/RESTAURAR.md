# Recuperar o Mekora a partir de um backup

**Estado:** vigente
**Última revisão:** 2026-09-07

Este documento é para quem precisa trazer o Mekora de volta e **não conhece o
código**. Ele diz o que digitar, o que esperar, e o que fazer quando dá errado.

O ensaio mais recente está em
[`operacional/ensaio-de-restauracao.md`](operacional/ensaio-de-restauracao.md) —
ele é gerado pelo próprio ensaio, e diz quando o caminho foi exercido pela
última vez.

---

## Antes de começar

| pré-condição | como conferir |
|---|---|
| Você tem os backups | `ls storage/backups/` traz `kindle_tool_*.db` e a pasta `espelho/` |
| Python 3.11 disponível | `python3 --version` |
| Um destino **vazio** para receber a cópia | a restauração recusa destino com dados |
| Espaço em disco | o espelho ocupa o mesmo que `input + output + covers + retratos` |

Nada mais é preciso: o script não instala dependência, não pede rede e não
escreve em lugar nenhum além do destino que você indicar.

---

## 1 · Ver o que existe

```bash
python3 scripts/restaurar.py --listar
```

Ele mostra cada snapshot com **data, tamanho, quantos trabalhos e quantas notas
tem dentro, e se o arquivo está íntegro** — e no fim o que o espelho guarda.

O número de trabalhos e de notas é o que permite escolher: um snapshot com menos
notas que você espera é um snapshot anterior à perda.

> **O espelho é único e sempre o mais recente.** Ele não tem versões. Restaurar
> um snapshot antigo com o espelho de hoje pode encontrar registro sem arquivo —
> se um livro foi removido no meio —, e a restauração **falha dizendo isso**. É o
> comportamento certo: o par não é um estado consistente, e ninguém deve
> descobrir isso depois.

---

## 2 · Escolher, e restaurar para uma cópia

```bash
python3 scripts/restaurar.py \
  --snapshot kindle_tool_20260907_153845.db \
  --destino /caminho/para/uma/pasta/vazia
```

`--snapshot` aceita o nome do arquivo, um caminho completo, ou a palavra
`ultimo`. **Não existe padrão**: escolher um backup em silêncio é como restaurar
o errado sem saber.

`--destino` é obrigatório e precisa estar vazio ou não existir.

O script imprime o que está fazendo e termina com as verificações. Se todas
passarem, ele diz `RESTAURADO` e mostra o comando para subir o Mekora contra a
cópia.

---

## 3 · O que é restaurado, e o que não é

**Restaurado:**

| o quê | onde vai parar |
|---|---|
| O banco | `<destino>/kindle_tool.db` |
| Documentos originais | `<destino>/input/` |
| O que a conversão produziu | `<destino>/output/` |
| Capas extraídas | `<destino>/covers/` |
| Retratos das contas | `<destino>/retratos/` |
| Configuração da instalação | `<destino>/config.json`, `config_presets.json` |

**E os caminhos são reescritos.** O banco guarda o caminho absoluto de cada
arquivo — `/Users/…/storage/output/12/livro.epub`. Restaurar noutro lugar sem
reescrever daria um Mekora que sobe, lista os livros e não abre nenhum. O script
troca a raiz antiga pela nova e depois varre o banco inteiro procurando qualquer
resto — em toda tabela e toda coluna de texto.

**NÃO restaurado, e nenhum por esquecimento:**

| o quê | por quê |
|---|---|
| `temp/` | descartável por definição; reconstrói-se sozinho |
| `logs/` | histórico operacional, não é dado de ninguém |
| `models/` | modelos de tradução: gigabytes, e se rebaixam |
| `ui-audit/` | saída de instrumento, regenerável rodando o instrumento |
| **Segredos** | `.env`, credenciais de SMTP, chaves — **nunca estiveram no backup** |

### Os segredos são a única coisa que você precisa recriar à mão

É política, e não esquecimento: segredo dentro de backup é segredo em mais um
lugar de onde vazar. Depois de restaurar, copie o `.env.example` para `.env` e
preencha — sem isso o Mekora sobe, mas não manda e-mail de entrada.

---

## 4 · Conferir que a cópia serve

As verificações rodam sozinhas durante a restauração. Para conferir uma cópia
**depois** — meses adiante, antes de promovê-la a produção:

```bash
python3 scripts/restaurar.py \
  --snapshot kindle_tool_20260907_153845.db \
  --destino /caminho/da/copia \
  --so-validar
```

São sete, e **nenhuma delas é "contou igual"**:

| verificação | o que ela pega |
|---|---|
| integridade do banco | páginas corrompidas — `PRAGMA integrity_check` |
| chaves estrangeiras | nota apontando para livro que não existe |
| contagem por tabela | linha perdida entre o snapshot e a cópia |
| caminhos apontam para o destino | caminho que ficou apontando para a máquina antiga |
| registro tem arquivo | livro que a Estante mostra e que não abre |
| nenhum arquivo truncado | arquivo que existe com zero byte |
| arquivos idênticos ao espelho | conteúdo trocado com o mesmo tamanho — hash, não `ls -l` |
| permissões no destino | banco ou pasta que a aplicação não consegue ler |

Cada uma tem um veneno próprio em `scripts/provar-restauracao.sh`, e o controle
negativo prova que ela reprova o defeito dela e só ele.

---

## 5 · Subir o Mekora contra a cópia

```bash
MEKORA_STORAGE=/caminho/da/copia \
  .venv/bin/python -m uvicorn main:app --app-dir backend --port 8300
```

`MEKORA_STORAGE` é a única variável que importa: ela diz onde estão o banco e os
arquivos. A aplicação roda as migrações pendentes ao subir.

Para provar que a cópia é **utilizável**, e não só íntegra, rode o ensaio — ele
faz isso sozinho, com um servidor próprio numa porta alta:

```bash
bash scripts/ensaio-de-restauracao.sh
```

Ele prova, pela API: a aplicação sobe, o `/history` devolve os trabalhos, **um
livro restaurado abre** (o EPUB é baixado e aberto como zip), as notas
sobrevivem com o texto delas, o progresso sobrevive com capítulo e deslocamento,
e todo registro de livro tem o arquivo dele no disco.

---

## 6 · Promover a cópia a produção

Só depois de a cópia passar nas verificações **e** no ensaio.

```bash
python3 scripts/restaurar.py \
  --snapshot kindle_tool_20260907_153845.db \
  --destino /caminho/do/storage/de/producao \
  --sobrescrever --sim-eu-quero-producao
```

**As duas flags são obrigatórias**, e é de propósito: uma só é fácil demais de
copiar de um comando antigo no histórico do terminal. O caminho padrão nunca
escreve em produção.

`--sobrescrever` **apaga o destino** antes de restaurar. Não há mesclagem: um
banco restaurado sobre arquivos de outro momento é um estado que ninguém
projetou, e a primeira leitura dele parece boa.

Depois disso, recrie o `.env` e suba o servidor como sempre — ver
[`SUBIR.md`](SUBIR.md).

---

## 7 · Quando a restauração falha

Ela **para no primeiro problema e diz qual verificação reprovou**. Não existe
sucesso parcial.

**O backup nunca é apagado**, em nenhum caminho de erro. Ele é a única coisa que
ainda funciona quando tudo o mais falhou.

O que fazer, por caso:

| o que ela disse | o que fazer |
|---|---|
| `snapshot de origem: … não está íntegro` | escolha outro com `--listar`. Este arquivo está corrompido no disco de backup |
| `destino não vazio` | escolha uma pasta vazia, ou passe `--sobrescrever` se quiser mesmo apagar o que está lá |
| `proteção de produção` | você apontou para o storage de produção. Se é isso mesmo, veja a seção 6 |
| `raiz do storage: … MAIS DE UMA raiz` | ver a seção abaixo |
| `integridade do banco` | o snapshot está corrompido — use o anterior |
| `contagem por tabela` | a cópia perdeu linhas. Apague o destino e tente de novo; se repetir, o disco de destino é suspeito |
| `registro tem arquivo` | o espelho não tem um arquivo que o snapshot promete. Ver a nota sobre o par snapshot/espelho na seção 1 |
| `arquivos idênticos ao espelho` | a cópia saiu diferente do original. Apague o destino e tente de novo |

Em todos os casos: **apague o destino antes de tentar de novo**. Ele pode ter
ficado pela metade, e restaurar por cima de meio restore é o estado que ninguém
projetou.

---

## Quando o banco tem caminhos de mais de uma raiz

Acontece quando o projeto mudou de pasta: os registros antigos ficam com o
caminho velho, os arquivos vieram junto, e o banco passa a ter duas grafias de
raiz. **O storage deste repositório é assim** — sete valores em duas colunas
guardam `/Users/…/Projeto-kindle/kindle-local-tool/storage`, de antes do renome
para `mekora`.

A restauração **recusa juntar sozinha**, e a razão é que juntar é afirmar que as
duas apontam para o mesmo acervo — o que pode ser falso: podem ser dois storages
de verdade, com arquivos diferentes de mesmo nome. Quem restaura é quem sabe.

```bash
python3 scripts/restaurar.py --snapshot ultimo --destino /uma/pasta/vazia --juntar-raizes
```

Ela lista as raízes que encontrou e reescreve todas para o destino. **A
verificação de "registro tem arquivo" cobra o resultado**: se um dos lados não
estava no espelho, ela reprova e diz qual arquivo falta.

---

## O que fazer periodicamente

```bash
python3 scripts/backup.py                     # o backup, diário
bash scripts/ensaio-de-restauracao.sh         # o ensaio, de tempos em tempos
```

O segundo é o que mantém a frase verdadeira. Um backup que ninguém restaurou é
uma promessa; o ensaio é o que a torna um fato — e ele leva sete segundos.
