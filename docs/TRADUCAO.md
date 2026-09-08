# A tradução: como ela é hoje, e onde se troca o modelo

**Estado:** vigente
**Última revisão:** 2026-09-08
**Itens:** `A2`, `A4`, `A5` do `ABERTO.md`
**Decisões:** `DEC-0032` (o conteúdo não sai), `DEC-0022 §8`

A `A2` perguntava *"como a tradução própria é construída"* e ficava esperando a
auditoria de um repositório — o `kindle-local-tool` — que **não existe mais nesta
máquina**: `/Users/sipnm/Projeto-kindle/` tem um `.DS_Store` e mais nada. Este
documento é a resposta tirada do código que existe.

---

## 1 · O pipeline atual

São dois, e eles compartilham o motor e mais nada.

### Texto — `translation_service.py`

```
extract_blocks  →  partir blocos grandes  →  chunk_blocks  →  engine.translate
                                                                    ↓
                                          disco  ←  blocks_to_html  ←  recompor
```

O artefato é um HTML intermediário, salvo antes da conversão pelo Calibre.

### Quadrinho — `comic_translation_service.py`

```
contar_paginas  →  extract_comic_pages  →  ocr_page  →  engine.translate
       ↓                                                       ↓
  limite de páginas                          comic_translation.json + .html
```

**Ele não edita imagem e não toca no KCC.** A saída é um par de arquivos ao
lado — um JSON e um HTML de leitura —, e é isso que "tradução de quadrinho"
significa hoje.

---

## 2 · As interfaces reais

| interface | onde | forma |
|---|---|---|
| `TranslatorEngine` | `translation_engine.py` | `Protocol` com `translate` e `is_pair_available` |
| `teto_de_entrada(engine)` | idem | lê `max_input_chars` do motor, com padrão |
| `criar_motor(nome, cfg)` | idem | a **única** fábrica |
| `progress_callback(stage, atual, total, msg)` | os dois pipelines | progresso **e** cancelamento: a exceção do callback propaga |
| `TextBlock` | `document_extractor_service.py` | dataclass imutável; a tradução usa `dataclasses.replace` |

O motor chega **pronto** aos dois pipelines, por parâmetro. Nenhum deles sabe
qual é.

---

## 3 · As responsabilidades, como estão

| parte | responde por |
|---|---|
| `translation_engine.py` | a interface, a fábrica, o teto, o Argos |
| `nllb_engine.py` | o NLLB: carregamento, cache, dispositivo, mapa FLORES-200 |
| `translation_model_service.py` | o que a TELA pergunta: biblioteca instalada, modelo em disco, comando de setup |
| `translation_service.py` | orquestrar texto: extrair, partir, agrupar, traduzir, remontar HTML |
| `comic_translation_service.py` | orquestrar quadrinho: extrair páginas, OCR, traduzir balões, escrever o par de artefatos |
| `app/api/jobs.py` | o job: estado no banco, progresso, erro, cancelamento |

---

## 4 · Os acoplamentos problemáticos encontrados

Todos medidos em 08/09, todos corrigidos. Estão aqui porque a lista é o valor da
auditoria — e porque cada um deles volta se ninguém souber que existiu.

### A fábrica morava na camada de API

`_build_engine` vivia em `app/api/jobs.py`. Duas consequências:

- `app/api/comic_quick.py` fazia `from app.api.jobs import _build_engine` — um
  módulo de API importando o **privado** de outro para chamar um serviço.
- `comic_quick_pipeline_service._check_engine` **reescrevia** a mesma decisão.
  Quem acrescentasse um motor teria dois lugares para lembrar e um para
  esquecer, e o esquecido é o que confere se o motor está pronto: a tela diria
  "pronto" para um motor que a fábrica nem sabe construir.

**Hoje:** `translation_engine.criar_motor` é a única, e `_build_engine` é um
apelido de uma linha para os cinco chamadores que já existiam.

### O truncamento silencioso

O NLLB roda com `max_length=512, truncation=True`, e o pipeline entregava blocos
de até 2000 caracteres. Medido com o `sentencepiece.bpe.model` do repositório:

| texto | caracteres | tokens | sobrevive |
|---|---:|---:|---:|
| parágrafo curto | 730 | 175 | inteiro |
| parágrafo longo | 5.840 | 1.400 | **37%** |
| capítulo sem quebra | 29.200 | 7.000 | **7%** |

Sem erro, sem aviso, sem log. **Hoje:** o motor declara `max_input_chars`, o
serviço parte o bloco e o recompõe. O NLLB declara 900, e o número saiu de
medida — no pior caso medido (termos técnicos) são 2,33 caracteres por token, e
512 tokens dão 1.193 caracteres; 900 deixa 25% de folga.

### As duas semânticas de "disponível"

`deu→fra` — um par que está nos dois mapas:

```
argos: False    "o par está instalado e funciona"
nllb:  True     "o par está no meu mapa de idiomas"
```

Mesma interface, duas respostas. Um `if engine.is_pair_available(...)` decidia
certo com um e errado com o outro. **Hoje:** os dois respondem "dá para traduzir
este par agora".

### O modelo que se dizia pronto

`is_nllb_model_ready` conferia só o `config.json`. No storage deste repositório:

```
storage/models/nllb/   config.json ✓  tokenizer ✓  pesos: NENHUM   (22 MB)
is_nllb_model_ready(...)  →  True
```

São 22 MB de metadados onde deveriam estar 2,4 GB — um download interrompido.
Com `transformers` instalado, o carregamento estouraria **no meio de um job**, e
não na tela de configuração, que é onde "falta baixar o modelo" custa trinta
segundos. **Hoje:** `modelo_utilizavel` procura os pesos.

O parâmetro `model_name` continua sendo aceito e **não** verificado — está dito
na docstring em vez de escondido: o que existe em disco é um diretório, e
compará-lo com o nome pedido exigiria um `_name_or_path` que o download deste
repositório traz `None`.

### O cache do modelo

Três defeitos num dicionário de módulo:

- **sem trava**: duas traduções que começam juntas carregam o modelo duas
  vezes — 2,4 GB cada, pico dobrado, e o resultado sai certo, então ninguém vê;
- **sem teto**: trocar o modelo configurado deixava o anterior residente para
  sempre;
- **o dispositivo fora da chave**: `device="cpu"` e `device="mps"` davam a mesma
  chave, e o segundo reusava o pipeline do primeiro — o parâmetro existia na
  assinatura e não tinha efeito.

**Hoje:** trava com dupla verificação, um modelo residente, dispositivo na
chave, e `esquecer_modelos()` — que antes só existia como reiniciar o servidor.

### A proteção de páginas depois da memória gasta

`limits.max_pages` era conferido **depois** da extração inteira. Medido com um
CBZ de 4.000 páginas — acima do limite de 3.000 e abaixo do de 5.000 entradas do
`archive_safety`, a faixa onde nenhuma outra proteção alcança: **49 MB já
estavam na memória**. Com páginas de tamanho real, gigabytes.

**Hoje:** `contar_paginas` lê o índice sem ler os bytes. Formatos que ela não
alcança (`cb7`, `cbc`) devolvem **-1**, e não 0 — não saber não é zero, e
devolver zero faria a proteção passar por omissão. A verificação de depois
continua, para eles.

### A exceção comparada por nome

```python
if type(exc).__name__ in ("EngineNotInstalledError", "LanguagePairNotAvailableError"):
```

O comentário dizia "para evitar import circular". **Não existe import circular:**
`translation_engine.py` não tem uma linha `from app.`. O custo do disfarce é
real — uma subclasse não casa, e renomear a classe transforma um erro de
configuração que deve abortar num "erro daquela página": o job termina com
sucesso, todas as páginas vazias, e o mesmo erro repetido dentro do JSON.

### Os artefatos pela metade

Entre `json.write_text` e `html.write_text` cabe um disco cheio ou uma queda, e
o que sobrava era um JSON sem o HTML que ele promete. **Hoje:** temporários no
mesmo diretório e `Path.replace`, que é atômico no POSIX — ou o par completo, ou
nada.

### O cancelamento que não entrava na página

Só era conferido **entre** páginas. Uma página de quadrinho tem dezenas de
balões: pedir para cancelar deixava o job rodando até o fim da página corrente,
uma chamada ao modelo por balão.

### A imagem do OCR ficava aberta

Um descritor por página. Num álbum de 3.000, o limite do sistema chega antes do
coletor de lixo.

---

## 5 · A diferença entre texto e quadrinho, e por que ela é legítima

O texto agrupa blocos com um separador e manda um chunk por chamada. O quadrinho
traduz **um balão por chamada**.

Parece desperdício e não é: no texto os blocos são parágrafos de um mesmo fluxo,
e o motor lucra com o contexto. No quadrinho cada bloco é uma fala isolada, e
juntá-las com um separador faz o modelo tratar personagens diferentes como um
texto só — o separador vira parte da frase traduzida e a divisão de volta erra.

O custo é conhecido: uma chamada por balão. É o preço de não misturar falas, e
agora está escrito no código em vez de parecer um esquecimento.

---

## 6 · A seam, e por que é esta

**A seam é `TranslatorEngine`, e ela já existia.**

Dois métodos, sem estado compartilhado com o resto do sistema, e os dois
pipelines recebem a instância **pronta** por parâmetro. O que faltava não era
abstração — era um único lugar onde a instância é escolhida.

**Nenhuma camada nova foi criada.** O que mudou:

| mudança | tamanho |
|---|---|
| `criar_motor` passa a morar em `translation_engine.py` | mover a função |
| `_build_engine` delega | uma linha |
| `_check_engine` chama a fábrica em vez de reescrevê-la | um bloco a menos |
| a fábrica reconhece `MEKORA_MOTOR_DE_TESTE` | quatro linhas |

**Abaixo de `translate(text, source, target) -> str` só existe o modelo.** A
auditoria procurou uma seam mais fina e não há.

### Por variável de ambiente, e não por configuração

A configuração é do produto e aparece na tela. Um motor de mentira escolhível na
tela é um motor de mentira que alguém escolhe sem querer — e o resultado é um
livro "traduzido" que ninguém consegue explicar. A variável é deliberada por
definição.

---

## 7 · O motor de teste

```bash
MEKORA_MOTOR_DE_TESTE=ok            .venv/bin/python -m uvicorn main:app --app-dir backend
```

| roteiro | o que faz |
|---|---|
| `ok` | sucesso determinístico: `[eng→por] o texto que entrou` |
| `ok:2` | falha duas vezes e depois passa — para exercitar nova tentativa |
| `erro` | `EngineNotInstalledError` |
| `indisponivel` | `LanguagePairNotAvailableError` |
| `timeout:3` | dorme 3 s e levanta `TimeoutError` |
| `invalido` | devolve um objeto que **não é texto** |
| `cancelamento` | `KeyboardInterrupt` a partir da terceira chamada |

**Ele não tenta traduzir.** A qualidade é problema do modelo; o que este motor
responde é o que o Mekora faz quando o motor se comporta de cada jeito — o job
fica preso em `in_progress`? o cancelamento chega? uma resposta que não é texto
vira erro claro ou `AttributeError` no log? o parcial é limpo?

Três detalhes de desenho, e cada um tem uma razão:

- **`timeout` dorme de verdade.** Um timeout que não gasta tempo não exercita o
  sistema esperando.
- **`cancelamento` levanta na terceira chamada.** Cancelar antes de começar não
  prova nada; é preciso haver trabalho feito.
- **`max_input_chars = 900`, o mesmo do NLLB.** Um stub sem teto testaria um
  caminho que o motor real nunca percorre.

---

## O que continua aberto

- **A qualidade da tradução não é medida por nada.** Não há avaliação
  automática, e nem deveria haver aqui: isso é escolha de modelo, não de
  arquitetura.
- **Não há timeout no motor de verdade.** Uma tradução travada trava o job. O
  stub sabe simular o caso; o produto ainda não sabe reagir a ele.
- **O modelo em disco não é conferido contra o nome pedido** — ver a seção 4.

Cobrado por:

```bash
.venv/bin/python -m pytest backend/tests/test_traducao_auditoria.py backend/tests/test_motor_de_teste.py -q
```
