# Propostas — o diretório está vazio, e isso é o resultado correto

Este diretório guarda material redigido para o Erik revisar. **Nada aqui tem autoridade.**

> Uma proposta não é uma decisão. Estar escrita, versionada e bem formatada não muda isso.
>
> Uma proposta aceita **sai** daqui. Este diretório nunca deve acumular decisão vigente — se
> acumular, virou um segundo registro, que é exatamente o que a consolidação existe para impedir.

## As nove saíram em 2026-08-20

`decisoes/` está vazio porque cumpriu a função. As nove propostas escritas em 20 de agosto foram
aceitas pelo Erik e promovidas para o registro:

```
mekora/propostas/decisoes/   →   erik-project-os/decisions/
                                  com Estado: accepted, data e quem aceitou
```

| | Assunto | Relação |
|---|---|---|
| `DEC-0021` | Modelo de conteúdo — duas famílias, formato canônico, identidade estável, arquivar × excluir | — |
| `DEC-0022` | O Mekora é web-first, e o conteúdo não vai para serviços externos de tradução ou IA | — |
| `DEC-0023` | Mobile no V1 com paridade de valor, não de interface | — |
| `DEC-0024` | Os cinco lugares, e Notas como entidade global | emenda DEC-0019 §1 e DEC-0018 |
| `DEC-0025` | O papel do canvas-motion, e onde o desenho aprovado vive | emenda DEC-0011 §1 |
| `DEC-0026` | Canonicalidade é por papel, não propriedade do repositório | — |
| `DEC-0027` | Estados de decisão, e evidência não é norma | — |
| `DEC-0028` | História se aposenta, não se apaga | — |
| `DEC-0029` | MVP e V1 são a mesma versão, e ela nasce observável | — |

Os números 0021 a 0029 estavam reservados e passaram a ser atribuídos. DEC-0014 e DEC-0015 seguem
sem existir: a confirmação da renumeração de 2026-08-14 continua pendente do Erik, e preencher os
buracos enterraria a pergunta.

## O corte temporal que isso cria — e o que ele NÃO significa

É o resultado mais útil de toda a consolidação, e precisa ser escrito com precisão:

```
DEC-0021 a DEC-0029   →   definitivamente vigentes
DEC-0001 a DEC-0020   →   autoridade histórica ainda existente,
                          sujeita a reconciliação contra o estado atual
```

**As decisões anteriores a 20/08 não perderam autoridade automaticamente.** Algumas continuam
vigentes; algumas já foram parcialmente emendadas; algumas podem estar obsoletas; algumas conflitam
entre si. É a reconciliação que determina qual é o caso de cada uma — e o resultado pode ser
`accepted`, `accepted + amended_by`, `superseded` ou `revoked`.

Ler este corte como "tudo antes da DEC-0021 é arquivo" seria erro grave, e da mesma família do
problema que a consolidação existe para consertar: decidir por proximidade ou por data, em vez de
por leitura.

Antes desse corte, o Mekora tinha decisões demais e nenhuma fonte com autoridade para dizer quais
valiam. Depois dele, existe um conjunto pequeno de normas datadas e indiscutíveis, com
relacionamento declarado nos dois sentidos, contra o qual as vinte anteriores podem finalmente ser
lidas.

## As perguntas abertas

[`ABERTO.md`](ABERTO.md) reúne as **61 perguntas** que as nove deixaram registradas, classificadas
**por momento de decisão** — antes da arquitetura, antes da feature afetada, antes do lançamento, ou
backlog técnico. É rascunho do futuro documento canônico de mesmo nome.

**Nenhuma delas virou decisão durante a promoção.** A classificação existe para que documentação
melhor organizada não vire paralisia de especificação: nenhuma das 61 bloqueia a escrita do PRD, e
as que bloqueavam foram respondidas antes da aceitação.

## Como elas foram escritas

Oito redatores em paralelo, cada um preso a um bloco com as palavras literais do Erik. Duas
auditorias adversariais independentes: uma caçando **decisão inventada**, outra caçando
**incoerência e citação errada de DEC vigente**. Onze achados graves na primeira rodada, todos
tratados numa revisão em que os revisores podiam rejeitar achado errado desde que apresentassem
evidência — seis foram rejeitados com razão, e três desses corrigiram erros do próprio material de
contexto.

A regra que governou a redação, e que explica por que algumas seções ficaram curtas:

> A seção **Decisão** só pode conter o que o dono decidiu. Tudo que o redator achasse que também
> deveria ser decidido vai para **"O que esta decisão NÃO decide"**.

A DEC-0025 foi o teste extremo: o Erik disse uma frase sobre a DEC-0011, e a seção Decisão dela
chegou a ter quatro itens inventados — incluindo uma regra de processo que ninguém pediu e a
reabertura de uma pergunta que a DEC-0011 já respondia. Depois da revisão sobrou um item, e o resto
virou pergunta. Na segunda rodada, com o Erik decidindo de fato o papel do `canvas-motion`, ela
voltou a ter cinco — agora com dono.

## Três correções de fato que valem além destas DECs

1. **"Superfícies" não significa aparelhos.** No vocabulário do registro, superfície é lugar do
   produto — `DEC-0018:51`. A regra 1 da DEC-0019 nunca tratou de paridade entre desktop e telefone.
2. **A DEC-0018 não exclui quadrinhos do MVP.** Exclui a *tradução* deles — `DEC-0018:15-17`.
3. **As 19 DECs anteriores declaram estado, em dois formatos.** Onze usam `- Estado: aceito`; oito
   usam `**Estado:** aceita`. O problema real não era ausência de estado — era ausência de
   vocabulário para dizer que uma decisão morreu.

## O que este diretório é daqui em diante

Continua sendo o lugar onde uma proposta espera revisão. Se voltar a ter arquivo em `decisoes/`,
é porque há material redigido e não decidido — e ele deve sair de novo, aceito ou descartado com a
razão escrita.

---

*Atualizado em 20 de agosto de 2026, na promoção das nove.*
