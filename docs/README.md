# Mekora — documentação canônica

**Estado:** vigente
**Última revisão:** 2026-09-03

Quatro documentos, e a ordem entre eles é a ordem de leitura:

```
PRODUTO.md         →  o que o Mekora é hoje
      ↓
SISTEMA.md         →  como as regras e entidades funcionam
      ↓
DESIGN-SYSTEM.md   →  como isso se manifesta na interface
      ↓
ABERTO.md          →  o que ainda não foi decidido
```

## A regra que vale para os três primeiros

> **Estes documentos descrevem o estado vigente.** Histórico, alternativas rejeitadas e evolução
> normativa pertencem às DECs e à reconciliação, e **não são repetidos aqui.**

Há **uma exceção declarada**, no `DESIGN-SYSTEM.md`: a seção *"O que já foi recusado, e por
medição"*. Ela existe porque uma escolha visual derrubada por medição volta sozinha se ninguém
escrever por que caiu — e voltar custa a mesma medição de novo.

## A ordem de autoridade

```
DEC                      a norma. Vive em erik-project-os/decisions/
  ↓
docs/                    o estado vigente descrito. Se divergir de uma DEC, o errado é o doc
  ↓
implementação            o que existe. Se divergir de uma DEC, é BUG
  ↓
protótipos antigos       material com história. Não é norma — DEC-0028
```

**Existir no repositório ou num protótipo não torna algo automaticamente uma decisão vigente.**

## Os outros documentos, e o papel de cada um

Os quatro do topo são o núcleo. Estes governam trabalho de verdade e não estavam
listados aqui — quem chegava tinha de descobri-los por `ls`, e um deles é uma
auditoria vencida, que se lê como estado se ninguém avisar.

**Referência corrente** — descrevem o que existe hoje:

| | |
|---|---|
| `CANVAS.md` | O Canvas. **A seção "Estado atual" é a única descrição autoritativa** do modelo: escolha temporária, Seção como único primitivo persistente, pertencimento explícito, ligações polimórficas, roteador de gesto. O resto do arquivo é registro histórico, marcado como tal |
| `TELAS-FIGMA.md` | O mapa entre os quadros do Figma e as telas construídas |
| `FONTES.md` | As fontes, e por que cada uma |

**Operacional e ferramenta** — como se faz, e como se mede:

| | |
|---|---|
| `PLAYBOOK.md` | Como acrescentar uma tela: portão, ícones, tokens, rotas, os dois temas. Escrito a partir das telas que existem |
| `SUBIR.md` | Subir, conferir e voltar atrás em produção; `alembic`, backup, rotas |

**Histórico** — registro de como se chegou aqui. **Não é estado vigente:**

| | |
|---|---|
| `CANVAS-AUDITORIA.md` | A auditoria de capacidades do Canvas, de 03/09/2026, **antes** do fechamento. A matriz lista como ausente uma dúzia de coisas que hoje existem. Superada por `CANVAS.md § Estado atual` |
| `operacional/` | Documentação do app operacional (Kindle Local Tool), preservada da fusão dos repositórios. Descreve uma árvore (`frontend/`, Vitest) que este repositório não tem |

## Quando uma decisão de arquitetura muda

Três passos, e o terceiro é o que costuma faltar:

1. **Atualizar a documentação de estado vigente** — o documento que descreve
   como a coisa funciona hoje.
2. **Marcar o raciocínio superado como histórico**, com um aviso no começo da
   seção. Investigação que foi medida e reprovada **fica**: ela explica por que o
   modelo atual é assim, e apagá-la faz a mesma medição ser paga de novo.
3. **Não deixar duas verdades "atuais" no mesmo arquivo.** Uma matriz de
   capacidades, uma tabela de precedência, um número de desempenho — um de cada,
   e o resto aponta para ele.

**E uma quarta, que vale para medição contra registro:** quando uma medida
contradiz um fechamento documentado, **o registro é corrigido ANTES do código**.
Um item marcado "fechado" contra um número que diz o contrário é pior que um item
aberto: o aberto convida a olhar, e o fechado falso desliga a pergunta para todo
mundo que vier depois — inclusive para quem escreveu.

Isto foi violado em 03/09, e a violação fica escrita: o C9 do `ABERTO.md` dava a
conferência de 390px por fechada, a auditoria mediu 102px de transbordo em toda
rota, e eu corrigi o registro **no mesmo commit** do conserto. Se o conserto
tivesse falhado ou demorado três dias, o documento teria continuado mentindo
nesse intervalo — e ninguém saberia, porque o commit que consertaria os dois
ainda não existia.

A razão é concreta: **as próximas sessões do Claude Code fazem onboarding por
estes arquivos.** Num documento com duas verdades, a superada é tão citável
quanto a vigente — nada no texto diz qual é qual, e o aviso é o que diz.

## Onde está o resto

| | |
|---|---|
| **A norma** | `erik-project-os/decisions/` — DEC-0001 a DEC-0033, com índice próprio |
| **Divergências entre norma e implementação** | `propostas/DRIFT-revisao.md` |
| **Evidência e material de trabalho** | `propostas/` — nada ali tem autoridade |
| **Material preservado e não classificado** | `resgate/` — com hashes e proveniência |

## O artefato

O **Protótipo de Produto do Mekora** é `prototipo-mesa.html`: referência funcional e de interação
vigente enquanto o Design System e uma fonte de design formal não existem `DEC-0033 §2`.

**Não é chamado de canônico, e a recusa é deliberada** — é o rótulo que fez a DEC-0011 sobreviver à
própria validade `DEC-0033 §3`.
