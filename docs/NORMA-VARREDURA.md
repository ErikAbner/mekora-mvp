# Varredura de norma — o que a norma diz e o que o código faz

**Feita em 03/09/2026, só de leitura.** Nada foi consertado nem construído: cada
afirmação normativa de `SISTEMA.md`, `PRODUTO.md` e `SUBIR.md` foi lida e
marcada. O gatilho foi contagem: cinco descompassos apareceram nesta semana sem
ninguém procurar — o C9, o B8, o limite descrito ao contrário no `SUBIR.md`, a
Tag e a "dispensada". **Cinco incidentais quer dizer que o número real é maior**,
e a única forma de saber é percorrer.

As três marcas:

```
VIGENTE                a norma descreve o que existe
NORMA NÃO CONSTRUÍDA   a norma manda, o código não faz
DESCREVE ERRADO        o documento afirma o que o código não faz — e o errado é o documento
```

---

## O que a varredura achou de mais grave

### ~~A nota NÃO sobrevive à exclusão do livro~~ — `DEC-0021 §15` · **CONSERTADO em 03/09**

**A nota sobrevive desde 03/09**, com a origem marcada como removida: `SET NULL`
no lugar do `CASCADE`, mais a coluna `origem_removida_em` e o título copiado
antes de o livro sumir. O registro do defeito fica abaixo, porque a razão dele
explica a forma do conserto.

**As duas perguntas que o conserto não responde continuam abertas** — se algum
livro foi apagado em produção, e se o backup já foi restaurado alguma vez. Ver
`ABERTO.md`, `C20` e `C21`.

`SISTEMA.md` escreve, com a razão junto:

> **Sobrevive à exclusão do item, por padrão**, com a origem marcada como
> removida `DEC-0021 §15`. A razão é normativa, não de conveniência: é trabalho
> intelectual de quem escreveu, e não simples derivado do arquivo.

O código faz o oposto, e sabe:

```
backend/app/models/nota.py:54
    job_id = Column(..., ForeignKey("processing_jobs.id", ondelete="CASCADE"), ...)

backend/app/api/jobs.py:1297
    "AS NOTAS SAEM JUNTO, por cascata. Isso não está escrito no botão do
     desenho, e por isso está escrito na confirmação da tela."
```

O produto é **honesto** — ele avisa antes de apagar, e conta quantas —, e mesmo
assim está do lado errado da norma. Pela ordem de autoridade do `docs/README.md`,
implementação que diverge de uma DEC **é bug**, não escolha.

O que a norma pede e não existe: a nota fica, com a origem marcada como removida.
Hoje não há coluna para "a origem sumiu" — `Nota.origem` guarda o título de onde
a nota veio quando ela não é de um trabalho daqui, e `job_id` some junto com o
trabalho.

**Não consertado nesta passada, de propósito:** mudar `CASCADE` para `SET NULL`
mais um campo de origem removida é migração com decisão de produto dentro — o que
a estante mostra depois, e o que acontece com uma nota cuja origem não existe
mais.

### "Para revisar" é NORMA, e não só rótulo de quadro — `DEC-0023 §4`

`PRODUTO.md` lista o que tem de funcionar **em todos os aparelhos**:

> Mesa · Estante · Reader · Busca · Destaques · Notas · **Marcadores** ·
> **Para revisar** — uma dessas indisponível ou inoperante **é falha de V1**
> `DEC-0023 §4`

Isto muda o B8-d de tamanho. Ele estava registrado como pergunta de forma — o
quadro dá o rótulo e não diz o que tira o estado. **A norma responde metade:** o
"para revisar" tem de existir como LUGAR, alcançável em todo aparelho. O que o
`DEC-0023 §4` não diz é o que TIRA o estado, e essa continua sendo a pergunta.

`Marcadores`, da mesma linha, saiu de "norma não construída" para **vigente** em
03/09.

### O vocabulário de Conexões vem de uma DEC, e não da redação velha — `DEC-0023 §6`

`PRODUTO.md`:

> **Conexões** | existe em todo aparelho; no telefone como **Relacionadas ·
> Trilhas · Assuntos**, em listas, sem grafo `DEC-0023 §6`

**Eu registrei errado no B8.** Escrevi que "Trilhas" e "Assuntos" eram vocabulário
da redação antiga do item, e não são: eles vêm da `DEC-0023 §6`. O que existe é um
**conflito entre a norma e o desenho** — os dois quadros de Conexões
(`895:8545`, `966:30269`) nomeiam Estudos, Relacionadas e as três faixas, e não
têm Trilhas nem Assuntos em lugar nenhum.

Pela ordem de autoridade, a DEC vence o documento e vence o desenho. Então ou os
dois quadros estão desatualizados em relação à DEC, ou a DEC precisa de emenda.
**É decisão do Erik**, e agora ela tem os dois lados medidos.

---

## O resto da varredura

### `SISTEMA.md`

| afirmação | marca |
|---|---|
| Duas famílias canônicas — textual e quadrinho `DEC-0021 §1` | **vigente** — o pipeline tem os dois caminhos |
| O item persistido é o EPUB responsivo `DEC-0021 §4` | **vigente** |
| Não existe PDF paralelo ao EPUB `DEC-0021 §6` | **vigente** — `epub_path` é o canônico |
| O Mekora não adota Work → Edition → Representation `DEC-0021 §3` | **vigente** |
| O original não é persistido depois da conversão validada `DEC-0021 §5` | **vigente** — a limpeza apaga por idade e por estado terminal |
| Nota sobrevive à exclusão do item `DEC-0021 §15` | **vigente desde 03/09** — era o achado mais grave desta varredura |
| Não existe "nota de Canvas" `DEC-0030 §7` | **vigente** — `canvas_nos` guarda `nota_id`, a nota é a mesma |
| Não existe segundo sistema de notas dentro do livro `DEC-0024 §6` | **vigente** — a ficha lê `lerNotas` do mesmo acervo |
| Destaque e nota são o mesmo registro *(forma vigente)* | **vigente** — uma tabela, `comentario` vazio distingue |
| Relação: uma só, duas maneiras de fazer `DEC-0030 §2` | **vigente** — `ligacoes` serve Canvas e Conexões |
| Relação **dispensada** *(forma vigente)* | **NORMA NÃO CONSTRUÍDA** no nível da nota — é o B8-f. Existe para grupos, nos Estudos (`grupos_ignorados`) |
| **Tag** — palavra colada na nota | **NORMA NÃO CONSTRUÍDA** — sem modelo, tabela, rota ou tela. É o B8-e |
| **Território** — assunto que apareceu sozinho | **NORMA NÃO CONSTRUÍDA** — não há entidade nem tela; o que existe é a varredura de `/notas/agrupadas` |
| **Coleção** — agrupa itens na Estante | **NORMA NÃO CONSTRUÍDA** — a Estante tem recortes (Tudo/Com nota/No Kindle/Quadrinhos), que são filtros derivados, não coleções |
| **Marcador** — um lugar para voltar | **vigente desde 03/09** |
| Âncora semântica, cinco degraus `DEC-0016` | **vigente desde 03/09** |
| Conteúdo não sai para serviços externos `DEC-0032` | **vigente** — a tradução é local (Argos/NLLB), e a privacidade declara |
| Toda exceção exige decisão explícita `DEC-0032 §4` | **vigente** — não há exceção declarada |
| Brasil é a jurisdição-base `DEC-0031` | **vigente** |
| O Canvas deve permitir (oito itens) `DEC-0030 §5` | **vigente** — os oito existem, inclusive "remover da superfície sem apagar a entidade" e "reutilizar a mesma Connection" |
| O Canvas não é (cinco negações) `DEC-0030 §6` | **vigente** |
| Identidade estável por item `DEC-0021` | **aberto na própria norma** — o formato do identificador é a `A4`, e o documento já diz que não está decidido |

### `PRODUTO.md`

| afirmação | marca |
|---|---|
| Cinco lugares: Mesa · Estante · Notas · Canvas · Conexões `DEC-0024 §1` | **norma incompleta, e não descrição errada** — o próprio `PRODUTO.md` diz que "cinco lugares" é arquitetura de informação e **não** cinco botões, então a navegação ter quatro não contradiz nada. O que contradiz é outra coisa: **`Estudos` é um lugar do produto — rota, tela, ícone na barra — e não aparece entre os cinco, nem no `PRODUTO.md` nem no `SISTEMA.md`.** Ele foi construído e a norma não o nomeia. Ou ele é um dos cinco com outro nome, ou a lista precisa de emenda. **Pergunta para o Erik** |
| Em todos os aparelhos: … Marcadores · Para revisar `DEC-0023 §4` | **norma não construída** — "Para revisar" não existe. Ver acima |
| A 390px, uma indisponível é falha de V1 `DEC-0023 §4` | **vigente** para as construídas — medido: 390 de 390 em dez rotas |
| Canvas desktop-only no V1 `DEC-0023 §5` | **vigente** |
| Conexões no telefone como Relacionadas · Trilhas · Assuntos `DEC-0023 §6` | **conflito norma × desenho** — ver acima |
| Tablet decide-se feature a feature `DEC-0023 §8` | **vigente** — nada foi decidido por herança |
| O Mapa | **aposentado em 03/09** |
| Original / Adaptado / Comparar deixou de ser arquitetura | **vigente** |

### `SUBIR.md`

| afirmação | marca |
|---|---|
| O limite de envio, descrito | **descreve errado** *(já conhecido, incidental desta semana)* |
| Não há papel de administrador; quem tem conta alcança `/config`, `/app-config`, `/presets` | **descreve errado** — `exigir_dono` existe desde 03/09 e fecha as três. A anotação envelheceu no dia seguinte |
| `docker compose exec backend alembic current` | **vigente** |
| Backup e conferência por `scripts/backup.py` | **vigente** |

---

## O que isto soma

**Quatro normas não construídas** — a nota que sobrevive à exclusão foi
consertada no mesmo dia; sobram a relação dispensada, a Tag, o Território, a Coleção — e uma sexta que a norma nomeia sem
existir: **"Para revisar"**.

**Duas descrições erradas**, as duas no `SUBIR.md`: o limite ao contrário e a
frase de que não há papel de administrador.

**Dois conflitos** que são decisão do Erik, não trabalho: o vocabulário de
Conexões (`DEC-0023 §6` × os dois quadros) e o lugar `Estudos`, que existe no
produto e não está entre os cinco da norma.

Nenhuma foi consertada nesta passada. As que viram trabalho, viram item; as que
viram decisão, viram pergunta.
