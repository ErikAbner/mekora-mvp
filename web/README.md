# mekora-web

A interface do produto Mekora. **Base de implementação**, respondendo a metade da
`A7` que a `DEC-0037` deixou aberta.

## O que este repositório é, e o que não é

**É** onde a interface do produto é construída. Consome os tokens do `mekora-ds` e
conversa com o `mekora-app` **por contrato de API**, nunca por fusão de
repositórios (`DEC-0011 §5`).

**Não é** o design system, que é o `mekora-ds`. **Não é** o backend, que é o
`mekora-app`. **Não é** exploração: para isso existem o `mekora-canvas-motion` e o
Protótipo de Produto, e os dois continuam vivos nos papéis deles.

## Por que nasceu vazio, e não como fork de algo

O `canvas-motion` tinha o encaixe mais óbvio — Drizzle, Workers, componentes
prontos. Mas a `DEC-0025` o definiu como **fonte exploratória**, e promover uma
exploração a base de produto é exatamente o erro que a `DEC-0011` cometeu e que a
`DEC-0033 §3` diz para não repetir sabendo qual é.

O que vem de lá vem por **colheita nomeada**, peça por peça, com a razão escrita:
o schema Drizzle de livros, notas e tags, e as funções puras de domínio.

## A pilha, e a razão

**Vite + React.** Não Next.

O Mekora é ferramenta de leitura com sessão iniciada: **não há o que SSR resolva**.
Menos superfície de framework é menos lugar onde o bug mora, e parte da dor da
Vynce veio do acoplamento com framework e CMS. Os componentes do `mekora-ds` são
React, então o encaixe é direto.

## Os dois instrumentos, que nascem junto com a primeira jornada

A Fase 1 do plano de implementação não começa por biblioteca de componentes.
Começa por **uma jornada que o usuário faz inteira**, com o portão e o verificador
nascendo junto. A razão é uma cicatriz escrita:

> A Vynce construiu o design system primeiro e descobriu no fim que o portão nunca
> tinha olhado a home.

**O portão mede a página servida**, não o código-fonte, e dirige um Chrome de
verdade por CDP. É a diferença que a Parte 1.1 do plano nomeia como a primeira das
cinco causas do sofrimento.

## Onde as decisões vivem

No Project OS, em `erik-project-os/projects/mekora.json` e nas `decisions/DEC-00xx`.
Nenhuma decisão de produto é tomada aqui dentro.
