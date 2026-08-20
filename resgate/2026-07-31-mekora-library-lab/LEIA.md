# Mekora — "Importar do Kindle" e o library-lab

> **Não classificado. Não canônico.** Estar aqui não torna nada uma decisão vigente.
> Ver [`../NOTA.md`](../NOTA.md) para a regra que vale em todo o diretório `resgate/`.

## Origem

| | |
|---|---|
| **Caminho original** | `C:\Users\erikc\Documents\Codex\2026-07-31\referenced-chatgpt-conversation-this-is-an` |
| **Data do material** | 31 de julho de 2026, entre 15h08 e 15h58 |
| **Data do resgate** | 20 de agosto de 2026 |
| **Origem preservada** | sim — nada foi movido, apagado ou alterado lá |
| **Git** | **nenhum.** Não é repositório. Este material nunca esteve sob versionamento |

## Motivo do resgate

É o **primeiro artefato que usa o nome Mekora** — `outputs/index.html` tem
`<title>Mekora — Importar do Kindle</title>`. E é o registro da inversão de direção do produto:
uma semana antes o Kindle era destino, aqui ele virou fonte, lido por cabo.

Nada disto esteve em Git em momento algum. Cópia única, numa pasta de trabalho do Codex.

## Atenção — homônimo perigoso

O caminho de origem é **exatamente igual** ao que `projects/mekora.json` registra como o
repositório `mekora-experience`, mas no Mac:

```
Mac:      /Users/sipnm/Documents/Codex/2026-07-31/referenced-chatgpt-conversation-this-is-an
Windows:  C:\Users\erikc\Documents\Codex\2026-07-31\referenced-chatgpt-conversation-this-is-an
```

**O conteúdo é diferente.** No Mac há `app/MekoraV2.tsx`, `MekoraExperience.tsx`,
`MekoraShelf.tsx` e um repositório Git com remoto. Aqui há o library-lab, sem `app/` e sem Git.
É coincidência do esquema de nomes do Codex, que batiza a pasta com a data mais as primeiras
palavras do prompt.

Risco concreto: quem esvaziar a máquina olhando o caminho pode concluir *"isto já está no
mekora-experience"* e apagar material que não está. Verificar por conteúdo, nunca por nome.

## O que está preservado aqui

Estrutura de diretórios mantida como na origem.

### `outputs/` — o protótipo "Importar do Kindle"

Autoral e independente do library-lab, apesar de morar na mesma pasta.

| Arquivo | Tamanho |
|---|---|
| `index.html` | 13,5 KB |
| `app.js` | 6,3 KB |
| `styles.css` | 20,0 KB |

Seis estados de importação (`connect → analyze → review → importing → disconnect → done`),
leitura do `My Clippings.txt`, e a promessa *"Apenas leitura · nada será apagado ou alterado"*.

Contém três coisas que o Mekora de hoje não tem:

- **Caixa de entrada** — *"Anotações que não puderam ser associadas com segurança ficam aqui —
  nunca são descartadas."* O limbo nomeado e revisável se perdeu.
- **Deduplicação, e o app reconhecendo o próprio output** — *"12 novos · 2 reconhecidos como
  criados no Mekora"*.
- **Fronteira legal explícita na interface** — *"Livros da Amazon · identificados por metadados ·
  Somente catálogo"*, e o histórico listando *"Conteúdo protegido copiado: 0"*.

### `outputs/mekora-library-lab/README.txt`

505 bytes, e o **único texto em prosa** que descreve o lab e nomeia as três vistas. Preservado
sozinho, sem o build ao lado, justamente porque some se alguém apagar a pasta por ser "build".

### `work/mekora-library-lab/` — os fontes

| Arquivo | O que traz |
|---|---|
| `src/main.js` (14,2 KB) | Três vistas do acervo: Grade, Canvas navegável e Estante 3D em WebGL. `initThree()` com névoa, prateleira, sombras suaves, 12 livros como geometria de caixa e capa gerada por textura de canvas. O Canvas tem drag, zoom no cursor com clamp e botão "Enquadrar" |
| `src/data.js` (5,6 KB) | 12 livros com os campos `summary`, `learn[]`, `questions[]`, `notes[]`, `tags[]`. Não é schema — é fixture — mas é a única forma de dado de livro documentada antes do produto atual, e `questions[]` é parente direto de "perguntas que guiam a leitura" |
| `src/style.css` (9,8 KB) | A identidade visual de julho: DM Sans e Newsreader, papel `#f5f1e8`, marca `#1d5551` |
| `index.html`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | O projeto Vite, para que o lab possa ser rodado de novo |

## Duas coisas que este material prova

**O Canvas não nasceu em 20 de agosto.** O commit `64becca` deste repositório se chama
*"O Canvas nao existia, e agora existe"*. É verdade para o repositório e falso para o produto:
ele existia em 31 de julho, funcionando, e era a **vista padrão** (`state={view:'canvas'}`).

**A premissa local-first foi promessa exibida, não detalhe de implementação.**
`outputs/index.html:24` fixa no rodapé da barra lateral, em todas as telas:

> **Processamento local** — Seus arquivos ficam sob seu controle.

E a prova negativa: `grep -i "conta|nuvem|sincroniz|servidor|login"` nos dois arquivos devolve
**zero**. Não é omissão de protótipo; é ausência sistemática. Esta premissa foi revogada em
10/08 (caderno 02, "premissa corrigida: produto com conta e continuidade") e consolidada na
DEC-0018. Este é o único documento **executável** do antes dessa decisão.

## Um falso cognato

`outputs/index.html` tem uma seção chamada **"Conexões futuras"**. Ela **não** é a ancestral do
Conexões de hoje. Ali era automação por aparelho — *"defina o que o Mekora fará quando este
Kindle voltar a ser conectado"*, com quatro automações e exportação em MD/CSV/JSON. O nome foi
reciclado para outro conceito. Vale como ideia, com outro nome, para não colidir.

## O que **não** foi preservado, e por quê

- `node_modules/` — regenerável a partir do lockfile preservado.
- `work/mekora-library-lab/dist/` e `outputs/mekora-library-lab/assets/` — **os dois builds são o
  mesmo build**, verificado por md5 no momento do resgate: `index-yICerqfl.js` =
  `fe219e47835146e6b348f69c37bfdced` e `index-DrsZ9QYe.css` = `b465ab1c41f9a3a05e2e1076b1940f70`
  nas duas cópias. Deriváveis dos três fontes em `src/`.
- `work/tipography-cards-reference/` (3,2 MB) — clone íntegro e em dia de
  `github.com/appariciojunior/tipography-cards`, repositório **público de terceiros**, sem uma
  linha autoral. Continua disponível na origem.
