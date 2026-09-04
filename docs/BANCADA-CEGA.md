# As telas que a bancada não mostra — 04/09

Duas descobertas do mesmo tipo, no mesmo dia, e a segunda é grande.

Nenhuma delas é um defeito do produto. As duas são defeitos da **medida**: rotas
que a auditoria visita, mede e dá por verdes sem nunca ter mostrado a tela que
elas nomeiam. É o verde por omissão na sua forma mais cara — o instrumento diz
"conferido" sobre uma coisa que não olhou.

## 1 · O Preparo, estado `analyzed`

`/preparo/:id` mostrava "Analisando o arquivo…" porque o semeador só gravava
`converted` e `done`. A tela `966:31504` — "o que encontrei", onde a pessoa
decide o que acontece com o arquivo dela — nunca apareceu.

**Consertado pela outra sessão em 04/09:** `scripts/_sessao.py` ganhou
`analisado`, e o semeador grava um trabalho parado nesse estado.

## 2 · As sete rotas privadas mostram o portão de quem não entrou

Medido a 390, com o token de `sessao-de-prova.sh`:

```
/conta                 →  "Criar conta no Mekora"
/conta/kindle          →  "Criar conta no Mekora"
/conta/preferencias    →  "Criar conta no Mekora"
/conta/privacidade     →  "Criar conta no Mekora"
/conta/seguranca       →  "Criar conta no Mekora"
/notas                 →  "Criar conta no Mekora"
/estudos               →  "Criar conta no Mekora"
```

Sete rotas, **uma tela**. E as sete estão em `PRIVADAS`, no `scripts/auditoria.sh`,
medidas com esse mesmo token.

**Não é falta de conta.** O `_sessao.py criar` insere em `pessoas` e em `sessoes`
com `pessoa_id`. E o cookie funciona para a API: as medidas da Estante leram
`/history` com `credentials: "include"` e receberam os seis livros semeados
daquela pessoa. Mas `/eu` responde `{"entrou": false}`, e o guardião de rota do
SPA manda para o portão.

Ou seja: a sessão vale para o backend e não vale para a tela. Onde exatamente se
perde é o que falta descobrir — e o `scripts/portao-logado.sh` já existe por
causa de um sintoma vizinho, com esta frase no cabeçalho:

> *"Numa tela protegida ele era redirecionado para /entrar e media essa —
> devolvendo verde para uma tela que nem tinha aberto. Verde por omissão, que
> este repositório já pagou três vezes."*

A quarta vez está aqui, num caminho diferente: agora não redireciona, RENDERIZA
o portão, e a medida acha que está na tela certa.

## O que isso invalida

Toda medida feita nessas sete rotas com `--sessao`. Inclui as auditorias
anteriores, a cobertura, e a Fase 4 na Conta — que parou aqui.

E explica por que oito itens do Erik continuam abertos em áreas "auditadas": os
17 a 20 são Estudos, os 29 a 32 são Conta. Ninguém nunca viu essas telas medidas.

## O que resolve

Uma sessão de bancada que o SPA reconheça. O `portao-logado.sh` e o
`entrar-como-dono.sh` já entram pelo caminho da pessoa — pedir o link e navegar
até ele —, que é o que o backend valida. O `sessao-de-prova.sh` corta caminho
gravando a sessão direto no banco, e é aí que a diferença nasce.

Enquanto não houver, qualquer varredura "em todas as rotas" continua contando
sete visitas ao mesmo portão.
