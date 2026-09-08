# Migrar o grafo legado para uma identidade estável

**Estado:** vigente
**Última revisão:** 2026-09-07
**Item:** `C10` do `ABERTO.md`

---

## O que este trabalho resolve

A pessoa era identificada por duas coisas, e **nenhuma é estável**:

| | por que não serve |
|---|---|
| `pessoas.id` | INTEGER sequencial: depende da ordem de inserção. Muda num restore para banco novo, numa fusão de bases, em qualquer reconstrução. Dois bancos do mesmo produto dão o id 7 a pessoas diferentes |
| `pessoas.email` | é a chave natural, e ela muda. Trocar de endereço não pode significar virar outra pessoa |

`pessoas.uuid` é opaco, imutável e não carrega informação sobre quem é — o que
também o torna o identificador certo para aparecer em log e em auditoria, pelo
critério da `DEC-0040`: id interno opaco é metadado operacional, e-mail não é.

E há o outro lado: **trabalho sem dono**. Converter não exige conta (`DEC-0018`),
então `processing_jobs.dono_id` aceita nulo por desenho. O legado deste
repositório tem **37 trabalhos assim**.

---

## O princípio, e ele é um só

> **Nunca inferir silenciosamente o proprietário de dados quando houver
> ambiguidade.**

O script **não adivinha**. Nome, e-mail parecido, título de livro, timestamp e
proximidade de registros estão fora — cada uma dessas pistas acerta na maioria
dos casos e erra em silêncio no resto.

O único sinal aceito é **estrutural**: uma chave estrangeira apontando para o
trabalho. Se as notas de um trabalho órfão são todas da pessoa 4, a pessoa 4 já é
dona do que está pendurado nele — isso não é palpite, é o grafo. Quatro tabelas
dão esse sinal: `notas`, `progressos`, `marcadores` e `canvas_livros`.

**E se o sinal apontar para duas pessoas, o script para.** Aí existe ambiguidade
de verdade, e ela exige mapeamento explícito.

---

## 1 · Rode as migrações

```bash
.venv/bin/python -m alembic -c backend/alembic.ini upgrade head
```

A `c7d81e3a94b2` cria `pessoas.uuid`, único e obrigatório, e preenche um para
cada pessoa que já existe. Sem ela, o script para e diz isso.

---

## 2 · Veja o que existe

```bash
python3 scripts/migrar-identidade.py --inventario
```

Não escreve nada. Ele mostra:

```
  sem dono: 37 trabalho(s)
    com sinal do grafo (uma pessoa) ...... 0
    ambíguos (mais de uma pessoa) ........ 0
    sem sinal nenhum ..................... 37

  recados anônimos: 2  (NÃO migram)
```

**Leia a linha do meio.** Ambíguos maior que zero significa que a migração
automática vai parar, e o inventário é onde isso aparece antes de você tentar.

---

## 3 · Ensaie

```bash
python3 scripts/migrar-identidade.py --destino <uuid|email>
```

**Sem `--executar` é ensaio, e o ensaio é o padrão.** Um script destrutivo cujo
padrão é executar depende de alguém lembrar da flag; o padrão certo é o que não
estraga quando a pessoa esquece.

`--destino` aceita **uuid ou e-mail**, e recusa o `id` — o id sequencial é
justamente a identidade instável que este trabalho substitui, e deixar migrar por
ele seria oferecer a arma ao lado do curativo.

O ensaio para, com código 2, quando:

| | |
|---|---|
| **ambiguidade** | um trabalho órfão tem notas ou progresso de mais de uma pessoa |
| **discordância** | o grafo aponta para uma pessoa **diferente** da informada |

O segundo é o mais perigoso dos dois: sem essa checagem a migração pareceria
bem-sucedida e teria movido o acervo de alguém para outro alguém.

---

## 4 · Execute

```bash
python3 scripts/migrar-identidade.py --destino <uuid|email> --executar
```

O que acontece, em ordem:

1. **backup** — `sqlite3.backup` e não `cp`: com o servidor no ar, copiar o
   arquivo pega o banco no meio de uma transação e produz uma cópia que abre e
   mente. Vai para `storage/backups/antes-da-migracao-de-identidade_*.db`.
2. `PRAGMA foreign_keys = ON` — o SQLite as deixa **desligadas** por omissão, e
   uma migração que roda assim pode gravar `dono_id` apontando para pessoa que
   não existe.
3. `BEGIN` — o `UPDATE` roda dentro de transação.
4. **a validação roda dentro da transação**, e é isso que a torna útil:
   reprovar aqui desfaz tudo. Validar depois do commit é escrever um relatório
   sobre um estrago já gravado.
5. `COMMIT`, ou `ROLLBACK` e falha dizendo o quê.

### O que a validação confere

| verificação | o que ela pega |
|---|---|
| quantos deviam mover × quantos moveram | um `UPDATE` que pegou menos linhas que o esperado |
| nenhum trabalho continua sem dono | migração pela metade |
| contagens antes × depois, por tabela | linha criada ou apagada — uma migração de propriedade não cria nem apaga nada |
| `PRAGMA foreign_key_check` | chave estrangeira quebrada |
| o pendurado não é de outra pessoa | nota da pessoa 2 num trabalho que agora é da pessoa 1 |

---

## 5 · Rollback

O comando sai impresso no fim da execução — quem precisa dele está com um
problema agora, e não vai procurar este arquivo:

```bash
# pare o servidor primeiro
cp storage/backups/antes-da-migracao-de-identidade_AAAAMMDD_HHMMSS.db storage/kindle_tool.db
```

O backup é o estado **anterior** à migração; é o que o torna um rollback e não
uma cópia de cortesia.

---

## O que migra, e o que não

**Migra** o trabalho órfão. Progresso, marcadores, notas e livros do Canvas já
carregam `pessoa_id` obrigatório — o que a migração faz por eles é **conferir**
que não ficaram apontando para outra pessoa.

**Não migra o recado anônimo.** Ele nasce sem dono por desenho: a caixa de recado
não pede conta. Dar dono a um recado anônimo é inventar propriedade, que é
exatamente o que o princípio proíbe. Um recado sem pessoa e sem e-mail não tem
dono a descobrir — ele não tem dono.

---

## Rodar de novo

É seguro e não é erro: a segunda execução responde `Nada a migrar` e sai com
zero. Idempotência aqui não é elegância — é o que permite rodar sem medo depois
de uma queda no meio.

---

## O controle negativo

```bash
.venv/bin/python -m pytest backend/tests/test_migrar_identidade.py -q
```

Dezesseis testes, e a maioria mede o script **recusando**: ambiguidade por
qualquer das quatro tabelas, sinal apontando para outra pessoa, destino
inexistente, id sequencial como destino, coluna `uuid` faltando, e a validação
que reprova dentro da transação e sai com o banco intacto.

**Cada teste monta o banco no estado que quer medir**, e a razão é a lei da casa:
o legado real tem 37 órfãos e nenhum com sinal do grafo. Rodar lá provaria só que
o caminho fácil funciona — a detecção de ambiguidade nunca dispararia.
