# Bancada do Canvas

Mede o custo de cada gesto do Canvas com uma cena realista. Dois arquivos:

- `semear-canvas-pesado.js` — a cena: 103 notas, 6 livros, 6 seções, 27 ligações
  e três notas com pertencimento **explícito** a uma seção. É `setup.js` do
  `medir.mjs`.
- `canvas.js` — as fases. É o `medida.js`.

## Como rodar

O número só vale contra o **build**, e não contra o servidor de desenvolvimento:
em `vite`, o StrictMode roda o corpo do componente duas vezes e o pacote não é
minificado. O mesmo arrasto dá 66–84ms de tarefa longa em `:5180` e zero em
`:5181`.

    scripts/prova.sh
    cd web && MEKORA_API=http://127.0.0.1:8199 npx vite build
    cd web && MEKORA_API=http://127.0.0.1:8199 npx vite preview --port 5181 &

    K=$(MEKORA_PROVA="$PWD/.ver" scripts/entrar-como-dono.sh | sed -n 1p)
    node scripts/medir.mjs "http://localhost:5181/entrar/$K" 1440 1000 \
      scripts/bancada/semear-canvas-pesado.js scripts/bancada/canvas.js \
      --depois=http://localhost:5181/canvas

## O que cada fase exige de si mesma

Toda fase que aperta alguma coisa **prova que acertou o que diz que pegou**, com
`elementFromPoint`. Sem isso a bancada já mediu três coisas erradas e passou nas
três: uma seção que estava por baixo do cabeçalho do app (o gesto virou laço, 31
desenhos), um livro fora da janela, e um campo de busca de outra tela.

E as fases que produzem efeito devolvem a contagem do efeito — `achados`,
`tracos_novos`, `escolhidos` —, porque um gesto que não fez nada também roda a
60fps.

## As jornadas da Leitura

Duas, e as duas afirmam o EFEITO — não a ausência de erro. Elas rodam contra o
servidor de desenvolvimento, porque o que medem é comportamento e não quadro por
segundo: para número de desempenho vale a regra de cima, o build em `:5181`.

**Cada corrida precisa de uma chave nova.** O link de entrada serve uma vez; usar
o mesmo duas vezes abre a tela de "Criar conta" e a jornada mede o produto
deslogado, com todos os passos vermelhos por uma razão que não é a que se está
investigando. Aconteceu duas vezes em 03/09.

    K=$(MEKORA_PROVA="$PWD/.ver" scripts/entrar-como-dono.sh | sed -n 1p)
    L=$(MEKORA_PROVA="$PWD/.ver" scripts/entrar-como-dono.sh | sed -n 2p)

`marcadores.js` — dobrar, listar, voltar, tirar. 12 passos. Prova também que o
progresso grava o capítulo em que a pessoa está, porque os dois passam pelo mesmo
cálculo de lugar — e foi ele que estava errado.

    node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
      scripts/bancada/marcadores.js --depois="http://localhost:5180/leitura/$L"

`ancora.js` — a escada da `DEC-0016`. 7 passos. Ela grava três notas com o
deslocamento MENTINDO, como ficariam depois de a extração mudar, e afirma onde a
marca caiu no texto e o que o caderno diz sobre isso.

    node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
      scripts/bancada/ancora.js --depois="http://localhost:5180/leitura/$L"

**`location.reload()` mata a medida** — "Inspected target navigated or closed".
Para o React reler o que entrou pela API, sai-se pelo roteador e volta-se com
`history.back()`: é navegação no mesmo documento, e o contexto sobrevive.

E a escada tem prova unitária separada, no navegador, junto do resto do leitor:

    node scripts/medir.mjs http://localhost:5180 1440 900 web/src/leitor/prova.js

## A jornada de Conexões

`conexoes.js` — as duas ações da candidata, 8 passos. Ela afirma o que cada uma
NÃO faz, que é onde estava o defeito: tocar o corpo do cartão não liga, e "Ir
para nota" navega sem ligar.

    node scripts/medir.mjs "http://localhost:5180/entrar/$K" 1440 1000 \
      scripts/bancada/conexoes.js --depois="http://localhost:5180/notas"

**Duas listas usam `.nota-candidatas`** — a das sugestões e a da folha "Ligar
esta nota a qual?". A medida precisa do escopo `.nota-sugestoes`: sem ele a
primeira versão pegou as 12 notas da folha, disse "12 candidatas" e reprovou
quatro passos por não achar botão nenhum. Mediu a lista errada e reprovou o
produto certo.
