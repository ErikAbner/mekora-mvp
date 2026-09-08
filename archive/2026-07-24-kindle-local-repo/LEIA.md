# Kindle Local — repositório Git sem remoto

> **Não classificado. Não canônico.** Estar aqui não torna nada uma decisão vigente.
> Ver [`../NOTA.md`](../NOTA.md) para a regra que vale em todo o diretório `resgate/`.

## Origem

| | |
|---|---|
| **Caminho original** | `C:\Users\erikc\Documents\Codex\2026-07-24\referenced-chatgpt-conversation-this-is-untrusted` |
| **Data do material** | 24 de julho de 2026 |
| **Data do resgate** | 20 de agosto de 2026 |
| **Origem preservada** | sim — nada foi movido, apagado ou alterado lá |

## Motivo do resgate

Repositório Git com **um único commit** e **nenhum remoto configurado**: `git remote -v`
devolve vazio. Existia uma cópia no mundo, nesta máquina. É o único código que carrega o nome
antigo do produto — `app/layout.tsx:16` define o título como *"Kindle Local — prepare e envie
seus livros"* — e a única versão do produto na direção antiga, em que o Kindle era **destino** e
não fonte.

## O que está preservado aqui

### `kindle-local.bundle`

História Git **completa**, gerada com `git bundle create --all`. Verificado na criação:

```
The bundle contains these 2 refs:
  30acdf06200ace925b4119dae17e28cb95ffa8d2 refs/heads/main
  30acdf06200ace925b4119dae17e28cb95ffa8d2 HEAD
The bundle records a complete history.
```

Estado do repositório de origem no momento do resgate: um branch (`main`), **nenhuma tag**,
**nenhum stash**, reflog com uma única entrada (o commit inicial), `git fsck` sem objetos soltos
ou pendentes, e working tree limpo. O bundle contém, portanto, tudo o que o repositório tinha.

Para restaurar em qualquer máquina:

```bash
git clone kindle-local.bundle kindle-local
```

O commit é `30acdf0 "Build Kindle Local guided conversion prototype"`, autorado por
`Codex <codex@openai.com>` em 24/07/2026 11:29 -0300.

### `gitignored/`

**A parte mais importante deste resgate.** O `.gitignore` do repositório de origem exclui
`/outputs/` e `/work/`, então estes arquivos **nunca entraram no histórico** — um `git push` do
repositório original não os levaria, e o bundle acima também não os contém.

| Arquivo | O que é | Tamanho |
|---|---|---|
| `index.html` | A versão **mais avançada** que o Kindle Local chegou a ter: sete etapas, validação de campo, cancelamento, agendamento com fuso. Posterior e superior ao `app/page.tsx` que está no commit | 24,6 KB |
| `prompt-claude-testes-kindle-local.md` | O briefing de avaliação: cinco perfis de usuário incluindo acessibilidade, severidades S0 a S3, WCAG 2.2 AA, protocolo de A/B de microcópia | 8,0 KB |
| `kindle-local-claude.zip` | Zip dos dois arquivos acima, preservado como veio | 11,2 KB |

Isto cria uma inversão que vale registrar: **o material fora do Git é melhor que o material
dentro dele.** O commit guarda a versão anterior do protótipo; `outputs/` guarda a versão que
veio depois.

Conforme instruído, **o `.gitignore` de origem não foi alterado e nada foi forçado para o
histórico original.** Alterar o repositório para salvá-lo mudaria o projeto que está sendo
auditado. Os arquivos vivem aqui, ao lado do bundle, e não dentro dele.

## Relação com os relatórios de teste

Os dois relatórios em [`../2026-07-24-kindle-local/`](../2026-07-24-kindle-local/) avaliam
exatamente este material — o `relatorio-testes-v1.md` analisa a versão do commit, e o
`relatorio-testes-v2-e-direcoes.md` analisa o `gitignored/index.html` daqui. Os três arquivos
devem ser lidos juntos.

## O que **não** foi preservado, e por quê

`node_modules/`, `dist/`, `.wrangler/`, `.next/` e os dois lockfiles do template: regeneráveis, e
cerca de 18.100 das 19.163 linhas do commit são só os lockfiles. O `README.md` da raiz é o do
template `vinext-starter`, não do produto. Tudo isso continua no bundle de qualquer forma, já que
o bundle preserva o commit inteiro.

**Ressalva sobre "regenerável":** reinstalar depende de a rede e o registry ainda servirem as
mesmas versões. Não é garantia, é probabilidade.

## Verificação de segurança

A varredura por credenciais no material resgatado não encontrou `.env`, `.pem`, `.key`, chave de
API, token ou string de conexão. `.openai/hosting.json` registra `"d1": null` — o banco declarado
no template nunca foi provisionado, e `db/schema.ts` continua o stub de quatro linhas.
