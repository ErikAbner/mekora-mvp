# Mekora — documentação canônica

**Estado:** vigente
**Última revisão:** 2026-08-21

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
