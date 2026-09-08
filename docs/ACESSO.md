# Acesso a dado de usuário

**Estado:** vigente
**Última revisão:** 2026-09-07
**Decisão:** `DEC-0041`

Este documento é para quem opera o Mekora. Ele diz quando é legítimo olhar dado
de outra pessoa, em que ordem investigar, e o que fica registrado.

---

## A regra, antes de tudo

**Acesso humano a dado de usuário não é parte normal da operação.** O produto
funciona sem que ninguém precise abrir livro, nota ou recado de outra pessoa.
Quando alguém precisa, é exceção — e exceção deixa evidência.

---

## 1 · A ordem de investigação

Comece pelo degrau menos revelador e só desça quando o de cima não responder.

| ordem | onde olhar | exemplos |
|---|---|---|
| 1 | métricas e códigos de erro | `stage_metrics`, o status HTTP, a exceção |
| 2 | metadados operacionais | formato, tamanho, duração, id interno |
| 3 | metadados sensíveis, e só os do problema | o título daquele livro que não converteu |
| 4 | **conteúdo** | o arquivo, a nota, o recado |

O degrau 4 exige que os três anteriores tenham sido insuficientes **e** que haja
justificativa legítima — uma das três abaixo.

---

## 2 · Quando o degrau 4 é legítimo

- **A pessoa pediu suporte** e a análise daquele conteúdo é necessária para
  atender o que ela pediu.
- **Incidente técnico ou de segurança** que não se diagnostica de outro jeito.
- **Obrigação legal válida.**

**E nada além disso.** Abrir produção para "ver o que aconteceu", sem um caso
concreto, não é investigação — é exploração, e a `DEC-0041` a proíbe pelo nome.

---

## 3 · Declare o motivo

Toda chamada a rota de dono feita **fora da interface** deve declarar o motivo:

```bash
curl -s -b "mekora_sessao=$TOKEN" \
  -H "X-Mekora-Motivo: $(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' 'incidente 12: e-mail de saída parou')" \
  "$API/recados"
```

**Por que percent-encoded:** cabeçalho HTTP é ISO-8859-1, e um motivo escrito em
português quase sempre tem acento — o cliente recusa enviar "saída" cru. Para um
motivo só em ASCII, o cabeçalho vai direto:

```bash
curl -s -b "mekora_sessao=$TOKEN" -H "X-Mekora-Motivo: incidente 12" "$API/config"
```

Quem clica na tela do dono não declara nada, e o registro grava **"não
declarado — operação pela interface do dono"**. Isso é de propósito: um motivo
inventado pelo sistema que se audita não é informação, e uma coluna inteira de
justificativas plausíveis não distinguiria rotina de exceção.

---

## 4 · O que fica registrado

Um evento por acesso, em `{MEKORA_STORAGE}/auditoria/acesso-AAAA-MM.jsonl`:

```json
{"quando":"2026-09-07T21:35:13+00:00","quem":"erik@…","motivo":"incidente 12",
 "escopo":"/recados","alvo":"—","acao":"GET","resultado":"HTTP 200"}
```

Os sete campos da `DEC-0041`, e **nenhum é opcional**. A tentativa negada
entra igual, com `HTTP 403` — e é a mais interessante das duas, porque é o único
sinal de que alguém tentou.

**O que NÃO entra:** o conteúdo que foi lido. O registro guarda rota, escopo e
resultado. Um registro que copiasse o recado para provar que alguém leu o recado
duplicaria o vazamento que ele existe para vigiar.

### Por que fora do banco

Um `DELETE FROM` no `kindle_tool.db` não alcança um arquivo que não está nele, e
o arquivo é aberto em modo **append**: escrever nunca reescreve o que já está lá.

**O limite, dito: quem tem o disco tem os dois.** Isto não é um cofre — é a
diferença entre apagar dado e apagar dado *sem deixar sinal*. Garantia de
verdade exigiria destino fora da máquina, e a `DEC-0041` deixa isso nomeado e
aberto.

---

## 5 · Ler o registro

```bash
.venv/bin/python -c "
import sys; sys.path.insert(0, 'backend')
from app import auditoria
for e in auditoria.ler(limite=50):
    print(f\"{e['quando'][:19]}  {e['resultado']:9}  {e['quem']:28}  {e['acao']} {e['escopo']}  — {e['motivo']}\")
"
```

Do mais novo para o mais velho.

---

## 6 · A revisão periódica

**Uma vez por mês**, e o que se procura é curto:

| procure por | porque |
|---|---|
| `HTTP 403` | alguém bateu na porta do dono sem ser dono |
| acesso a `/recados` | é a rota que serve conteúdo de outra pessoa |
| `não declarado` fora de horário de trabalho | rotina pela interface é esperada; às 3h não é |
| `erro na aplicação` | a porta deixou passar e algo estourou depois |
| ausência de linhas num mês inteiro | o registro pode ter parado de ser escrito |

O último é o mais fácil de não notar: um arquivo que não cresce parece um
sistema tranquilo.

### Quem revisa

**O operador responsável pelo Mekora** — hoje, o Erik. E isto está escrito
porque a tentação é o contrário:

> **Não existe auditoria independente no Mekora, e afirmar que existe seria pior
> que não ter.**

Quem opera é quem revisa. Uma segunda pessoa é o que tornaria a revisão
independente, e não há.

---

## 7 · Retenção

**90 dias**, o mesmo prazo dos eventos de uso (`DEC-0029`) — dois prazos para
lembrar viram um lembrado e outro esquecido. A limpeza roda no startup, junto da
de arquivos, e apaga **arquivos mensais inteiros**: por linha exigiria
reescrever o arquivo, e quem pode reescrever para limpar pode reescrever para
sumir com um evento.

Um mês só vence quando o mês **inteiro** venceu.

---

## O que está coberto, e o que não está

**Coberto:** as quatro portas de dono — `/config`, `/app-config`, `/presets` e
`/recados` do dono. Rota nova atrás de `exigir_dono` nasce registrada, porque o
registro é middleware e não decorador de rota.

**Não coberto, e vai dito:**

- **Acesso direto ao banco pelo disco.** `sqlite3 storage/kindle_tool.db` não
  passa pela aplicação e não deixa evidência. É a razão de o item 2 desta lista
  existir: o registro cobre a porta, não a máquina.
- **Os scripts de manutenção** (`backup.py`, `restaurar.py`, `semear.py`). Eles
  operam sobre o banco inteiro por desenho, e quem os roda já está no disco.

Cobrado por `.venv/bin/python -m pytest backend/tests/test_auditoria.py`.
