# O contrato

Onde o backend em Python e a interface em React se encontram. A `DEC-0038` fundiu
os repositórios por causa deste arquivo: acrescentar um campo no Python e exibi-lo
na tela passa a ser **um commit**, e não dois em dois lugares sem nada que prove
que batem.

```
node contrato/estado.teste.mjs
```

## O que ele resolve, e não é encanamento

**O backend carrega sete campos de estado ao mesmo tempo.** `status`,
`ocr_status`, `conversion_status`, `send_status`, `translation_status`,
`comic_translation_status`, `comic_export_status`. **A tela mostra um.**

Espalhar essa redução pelos componentes é como duas telas passam a discordar
sobre o mesmo arquivo: a fila diz *pronto* e a estante diz *convertendo*, porque
cada uma olhou um campo diferente. Aqui a redução acontece uma vez.

## As três regras da derivação, e a ordem entre elas

**1 · Erro vence tudo.** Um arquivo que falhou em qualquer etapa está com erro,
mesmo que outra tenha concluído. Mostrar *pronto* porque a conversão terminou,
quando o **envio** falhou, é mentir sobre o que o usuário vai encontrar no Kindle.

**2 · Trabalhando vence pronto.** Enquanto uma etapa anda, o arquivo não está
pronto.

**3 · Pronto exige o trabalho *pedido*, não todo trabalho possível.** Um documento
que não pede tradução está pronto sem ela. Exigir `translation_status: done` de
todo mundo faria metade da estante parecer inacabada para sempre.

## O motivo do erro vem do backend

Nunca é inventado aqui. Uma frase genérica esconde o que aconteceu, e é o que faz
o usuário abrir um chamado que ninguém consegue responder.

## O alarme, e a pergunta que ele faz

`estadosNaoCobertos()` confere se **todo valor que o backend pode emitir cai em um
balde nomeado** — `FALHOU`, `ANDANDO` ou `NEUTRO`. Sem isso, um estado novo
acrescentado no Python vira tela que mostra *fila* para sempre, sem erro nenhum.

A primeira versão perguntava outra coisa — *"esse valor muda o resultado?"* — e
acusou três falsos: `ocr_status="done"`, `translation_status="done"` e
`comic_export_status="done"`. Os três estavam certos, porque **sub-etapa concluída
não deixa o arquivo pronto**. O estrito demais era a pergunta.

## As rotas, lidas e não supostas

| verbo | rota | onde | papel |
|---|---|---|---|
| `POST` | `/upload` | `jobs.py:565` | importar |
| `GET` | `/analyze/{upload_id}` | `jobs.py:653` | validar |
| `GET` | `/jobs/{id}/status` | `jobs.py:827` | acompanhar |
| `POST` | `/jobs/{id}/convert` | `jobs.py:891` | converter |
| `POST` | `/jobs/{id}/send` | `jobs.py:1201` | enviar ao Kindle |
| `GET` | `/history` | `jobs.py:688` | a estante |

As três primeiras são exatamente os verbos que a **`DEC-0011 §6`** exige para o
frontend legado se aposentar: *importar com validação, acompanhar a conversão até
o fim, e enviar ao Kindle*.

## Acompanhar para sozinho

Polling sem fim é como um erro vira consumo de bateria: se a conversão morreu no
servidor, o cliente pergunta para sempre. `acompanhar()` para em três casos —
pronto, erro, ou o teto de tempo — e **o teto é relatado**, não silencioso.
