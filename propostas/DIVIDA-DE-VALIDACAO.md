# Dívida de validação conhecida

**Registrado em:** 2026-08-20
**Estado:** aberta
**Por que existe:** para que ninguém rode o teste daqui a uma semana, veja vermelho, e não saiba se
é esperado ou novo.

## O que está vermelho

```bash
npm --prefix /c/Users/erikc/Projeto-os/erik-project-os run check   # 4 falhas
npm --prefix /c/Users/erikc/Projeto-os/erik-project-os test        # 10 asserções
```

| | |
|---|---|
| **Escopo** | handoffs da Vynce e do erik-project-os, de 2026-08-02 |
| **Sintoma** | `prompt está fora de sincronia com o registro estruturado` e `prompt_sha256 não corresponde ao arquivo prompt` |
| **Arquivos** | `handoffs/erik-project-os/20260802T172225Z-formalizar-responsabilidades-...json`<br>`handoffs/pre-validacao-interfaces/20260802T163111Z-auditar-documentacao-...json` |
| **Teste que quebra** | `tests/cli.test.mjs:63` — *validates the repository manifests* |
| **Introduzida** | antes da promoção das DEC-0021 a DEC-0029 |
| **Contexto** | trabalho ativo da Vynce no mesmo repositório |

## Prova de que é anterior, e não foi causada pela promoção

Verificado em 20/08, antes e depois:

```
árvore limpa, antes de qualquer mudança   →  10 asserções
com as nove DECs promovidas               →  10 asserções
```

Mesmo número. Nenhuma falha foi acrescentada pela promoção.

O `validate` chegou a acusar **6** durante a sessão — as 4 acima mais 2 de um handoff da Vynce
escrito às 17h56 com `sha` dessincronizado. Uma sessão da Vynce corrigiu esse por conta própria, e
voltou a 4.

## ⚠ Atualização — o conjunto de testes depende de máquina

Descoberto em 20/08, depois do commit `46e62ff`, que destravou um teste acoplado à prosa do
`next_milestone`.

**A mesma suíte dá resultados diferentes nas duas máquinas:**

| | `npm test` |
|---|---|
| **mac-mini-erik** | 27 passaram, 0 falharam — relatado no commit `46e62ff` |
| **windows-erikc** | 8 asserções falham, em 4 casos de teste |

A causa é acoplamento a máquina dentro do próprio teste. `tests/cli.test.mjs:523-524` afirma
literalmente:

```js
assert.equal(manifest.last_reviewed_from, "mac-mini-erik");
assert.ok(manifest.repositories[0].local_paths["mac-mini-erik"]);
```

Os quatro casos que falham no Windows:

- `validates the repository manifests` — pelos 4 handoffs de 02/08
- `cancels a run opened by mistake without inventing evidence`
- `keeps machine-specific paths honest instead of printing another machine's path`
- `refuses to authorize a new project whose code lives in a single copy`

**Consequência prática:** "verde" não é um fato do repositório — é um fato do repositório *numa
máquina*. Quem verificar regressão precisa comparar o número **na mesma máquina** em que mediu antes.

Nesta máquina, **8 é o valor esperado hoje** (eram 10 antes de `46e62ff`). No Mac, é **0**.

Isto é a DEC-0008 — manifestos conscientes de máquina — aparecendo dentro dos testes, que não
receberam o mesmo tratamento. Não foi corrigido: é o mesmo motivo de antes, escopo da Vynce e sessão
ativa.

## Por que não foi consertada

Três razões, nesta ordem:

1. **É registro da Vynce, não do Mekora.** Consertar registro de outro projeto durante uma sessão de
   consolidação deste é ultrapassar escopo.
2. **A sessão da Vynce estava ativa no mesmo repositório.** Editar arquivo que outro processo pode
   reescrever troca uma falha pequena por um conflito.
3. **Não bloqueava nada.** A promoção das nove decisões não depende de `validate` verde, e
   `validate` não valida decisões — a DEC-0027 registra justamente isso como lacuna.

## Quando resolver

Depois que o trabalho da Vynce fechar. O conserto é mecânico: recalcular o `prompt_sha256` de cada
handoff contra o `.prompt.md` correspondente, ou reconciliar o registro estruturado com o prompt,
conforme qual dos dois esteja correto.

**Enquanto esta dívida existir, `npm test` vermelho neste repositório não é sinal de regressão.**
Quem for verificar algo novo deve comparar o número de asserções, não a cor: **10 é o valor
esperado hoje**.
