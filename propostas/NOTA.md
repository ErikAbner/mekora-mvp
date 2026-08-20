# Propostas — redigidas, não aceitas

Este diretório guarda material redigido para o Erik revisar. **Nada aqui tem autoridade.**

## A regra

> Uma proposta não é uma decisão. Estar escrita, versionada e bem formatada não muda isso.

Todas as oito DECs em `decisoes/` declaram `**Estado:** proposta`. Nenhuma foi aceita. Nenhuma está
em `erik-project-os/decisions/`, que é onde uma decisão passa a valer. Enquanto estiverem aqui, elas
não governam código, tela, documento nem registro.

Isto é o oposto do problema que o projeto está consertando: 88 decisões reais que nunca foram
escritas. Aqui há oito textos escritos que ainda não são decisões. Os dois estados são distintos e
os dois precisam ficar visíveis.

## Por que existem

Em 20 de agosto de 2026, uma auditoria de consolidação apurou que o Mekora tinha decisões demais e
nenhuma fonte com autoridade para dizer quais valiam. Oito perguntas foram levadas ao Erik. Ele
respondeu, corrigiu três das direções propostas, e autorizou: *"pode preparar os rascunhos de DEC
como proposta, sem ainda alterar implementação, schema, registros ou canonicalidade. Mostre os
rascunhos antes de aceitá-los."*

## O que está em `decisoes/`

| | Assunto | Emenda declarada |
|---|---|---|
| `DEC-0021` | Modelo de conteúdo — duas famílias, formato canônico de leitura, identidade estável | nenhuma |
| `DEC-0022` | O Mekora é web-first | nenhuma |
| `DEC-0023` | Mobile no V1 com paridade seletiva | nenhuma |
| `DEC-0024` | Os cinco lugares | DEC-0019 regra 1, e DEC-0018 na enumeração das superfícies |
| `DEC-0025` | A forma da correção da DEC-0011 | DEC-0011, ponto por decidir |
| `DEC-0026` | Canonicalidade é por papel, não propriedade do repositório | nenhuma |
| `DEC-0027` | Estados de decisão, e evidência não é norma | nenhuma |
| `DEC-0028` | História se aposenta, não se apaga | nenhuma |

Os números 0021 a 0028 estão **reservados**, não atribuídos. DEC-0014 e DEC-0015 nunca existiram
como arquivo e não foram reaproveitados aqui: a confirmação da renumeração de 2026-08-14 continua
sendo pendência do Erik, e preencher os buracos agora enterraria a pergunta.

## Como foram escritas

Oito redatores em paralelo, cada um preso a um bloco com as palavras literais do Erik. Depois, duas
auditorias adversariais independentes: uma caçando **decisão inventada**, outra caçando **incoerência
entre os rascunhos e citação errada de DEC vigente**. Onze achados graves na primeira rodada. Todos
tratados numa revisão, com os revisores autorizados a rejeitar achado errado desde que apresentassem
a evidência — e seis foram rejeitados com razão.

A regra que governou a redação, e que explica por que algumas seções "Decisão" são curtas:

> A seção **Decisão** só pode conter o que o dono decidiu. Tudo que o redator achasse que também
> deveria ser decidido vai para **"O que esta decisão NÃO decide"**.

A DEC-0025 é o caso extremo e o melhor teste da regra: o Erik disse uma frase sobre a DEC-0011, e a
seção Decisão dela tem **um item**. O primeiro rascunho tinha quatro, incluindo uma regra de processo
que ninguém pediu e a reabertura de uma pergunta que a DEC-0011 já responde.

## Três correções de fato que apareceram no processo

Registradas aqui porque valem além destas DECs:

1. **"Superfícies" não significa aparelhos.** No vocabulário do registro, superfície é lugar do
   produto — `DEC-0018:51`, "O design system é feito para quatro superfícies (Mesa, Estante, Canvas,
   Conexões)". A regra 1 da DEC-0019 nunca tratou de paridade entre desktop e telefone.
2. **A DEC-0018 não exclui quadrinhos do MVP.** Exclui a *tradução* de quadrinhos — `DEC-0018:15-17`.
3. **As 19 DECs declaram estado, em dois formatos.** Onze usam `- Estado: aceito` como item de
   lista; oito usam `**Estado:** aceita` no cabeçalho. A primeira auditoria reportou que onze *não*
   declaravam — o `grep` original procurava só o segundo formato. O problema real é outro, e é pior:
   os únicos valores em uso são `aceito`/`aceita` e `pendente`. Não existe valor que signifique
   "substituída" ou "revogada", e nenhum arquivo tem campo que aponte uma decisão substituta.

## O que acontece com estes arquivos

```
propostas/decisoes/   →   Erik revisa   →   aceita ou devolve
                                             │
                          aceita  →  erik-project-os/decisions/  (com Estado: aceita e data)
                        devolve  →  volta para cá corrigida, ou é descartada com a razão escrita
```

Uma proposta aceita **sai** deste diretório. Este diretório nunca deve acumular decisões vigentes —
se isso acontecer, virou um segundo registro, que é exatamente o que a consolidação existe para
impedir.

---

*Criado em 20 de agosto de 2026. Nenhum registro, schema, manifesto ou implementação foi alterado
para criar este diretório.*
