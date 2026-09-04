# Varredura de norma — o que a norma diz e o que o código faz

**Feita em 03/09/2026, só de leitura.** Nada foi consertado nem construído: cada
afirmação normativa de `SISTEMA.md`, `PRODUTO.md` e `SUBIR.md` foi lida e
marcada. O gatilho foi contagem: cinco descompassos apareceram nesta semana sem
ninguém procurar — o C9, o B8, o limite descrito ao contrário no `SUBIR.md`, a
Tag e a "dispensada". **Cinco incidentais quer dizer que o número real é maior**,
e a única forma de saber é percorrer.

As três marcas:

```
VIGENTE                    a norma descreve o que existe
NORMA NÃO CONSTRUÍDA       a norma manda, o código não faz
DESCREVE ERRADO            o documento afirma o que o código não faz — e o errado é o documento
ESBOÇO CITADO COMO NORMA   nenhuma DEC decidiu; um documento a jusante o listou, e a
                           lista fez parecer obrigação
RESOLVIDA POR OUTRO CAMINHO  o produto já faz a coisa, com outro nome
```

As duas últimas nasceram do teste de 03/09, e a primeira delas é o mecanismo que
já tinha mordido no §6 de Conexões.

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

### O vocabulário de Conexões — **resolvido pela própria DEC, e eu errei duas vezes antes**

`PRODUTO.md` cita a `DEC-0023 §6` assim:

> **Conexões** | existe em todo aparelho; no telefone como **Relacionadas ·
> Trilhas · Assuntos**, em listas, sem grafo

Registrei isto primeiro como "redação velha do item" — errado — e depois como
"conflito entre norma e desenho, decisão do Erik" — errado de novo, e pela mesma
causa: **li o §6 sem ler a lista de pendências da própria DEC.** Ela diz, no
mesmo arquivo:

> **Como Relacionadas, Trilhas e Assuntos se apresentam.** Erik esboçou o
> formato: dentro de uma nota, um bloco `RELACIONADO` listando as notas próximas
> com o livro de origem, e um "Ver trilha →". **É ponto de partida para desenho,
> não especificação fechada.**

**A DEC não fechou o vocabulário: ela o delegou ao desenho.** Então não há
conflito de autoridade a resolver, e não há emenda a fazer.

**As duas datas**, que era o que o critério pedia:

| | data | como se sabe |
|---|---|---|
| `DEC-0023` | **2026-08-20** | `Data:` no cabeçalho, aceita no mesmo dia |
| `895:8545` e `966:30269` | **existiam em 2026-09-01** | é limite inferior, não criação: é a primeira vez que os ids aparecem no repositório, no commit do inventário. **O conector do Figma não expõe data de nó** — `get_metadata` devolve nome, posição e tamanho, e nada de tempo |

Pelas datas o desenho é posterior em pelo menos doze dias; pelo texto da DEC ele é
quem tinha de dizer a forma. **Os dois apontam para o mesmo lado: constrói-se o
que está no quadro** — Estudos, Relacionadas, Parecem próximas, Talvez, Talvez um
estudo, Tag, Conectar outra nota.

**O que sobra é de documento, não de produto:** o `PRODUTO.md` cita o §6 como se
fosse fechado, sem a ressalva que a DEC escreveu ao lado. É assim que uma frase
de ponto de partida vira especificação por citação.

---

## Teste de norma: Tag, Território e Coleção — 03/09, veredito só

As três estavam marcadas como "norma não construída". **O teste de quatro
perguntas diz que duas delas nunca foram norma**, e a terceira é a única com
quadro. Nenhuma foi construída, e nenhuma deve ser pelo que está escrito hoje.

| pergunta | **Tag** | **Território** | **Coleção** |
|---|---|---|---|
| **a.** DEC de origem, e com ressalva? | **nenhuma DEC define Tag como entidade.** As oito ocorrências de "tag" no corpus são falso positivo — con**tag**em, e-**tag**ueta | **zero ocorrências de "territ" em todo o corpus de DECs** | uma só, na `DEC-0037:119`, e em sentido de DESENHO: *"superfície de marca — destaque, etiqueta, coleção — não tinta"*. Não é a entidade |
| **b.** documento a jusante citou sem ressalva? | **sim, e é a origem inteira da "norma"** — o `SISTEMA.md` a lista entre as entidades, e o diagrama de entidades lê-se como norma | **sim, idem** | **sim, idem** |
| **c.** quadro no Figma? | **SIM** — `895:8663` no computador e o par no telefone: rótulo "Tag" e um chip. Duas ocorrências em cada quadro de Conexões | **não** | **não** |
| **d.** o produto resolve por outro caminho? | não | **SIM** — "assunto que apareceu sozinho, por se repetir em itens diferentes" é literalmente o que `/notas/agrupadas` faz: acha grupos que dividem palavras entre livros, oferece virar Estudo, e pode ser calado (`grupos_ignorados`). **Nomear um território = criar um Estudo** | não |
| **VEREDITO** | **esboço citado como norma — mas com quadro** | **resolvida por outro caminho** | **esboço citado como norma** |

**O que isto muda no saldo:** a varredura contava três "normas não construídas"
que não eram normas. **A regra do próprio `SISTEMA.md` já dizia**, no preâmbulo:
*"Onde uma seção não tiver nenhuma das duas marcas, ela está aberta — e está
listada em `ABERTO.md`. Este documento não preenche buraco com invenção."* As
três seções não têm marca nenhuma — nem `DEC-XXXX`, nem "Forma vigente".

É o mesmo mecanismo do §6 de Conexões: **o diagrama de entidades faz três
esboços parecerem obrigação**, porque o formato de uma lista de entidades não
distingue o que foi decidido do que foi anotado.

**Nenhuma das três foi construída, e nenhuma deve ser por causa deste documento.**
Tag tem quadro, então quando houver razão de produto ela entra pelo desenho —
com a regra do B8-e já escrita: oferta, nunca etapa. Território sai da lista.
Coleção precisa de decisão antes de código.

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
| Relação **dispensada** *(forma vigente)* | **vigente desde 03/09** — `sugestoes_dispensadas`, com o par normalizado e desfazer imediato |
| **Tag** — palavra colada na nota | **esboço citado como norma** — nenhuma DEC a define; tem quadro (`895:8663`). Ver o teste acima |
| **Território** — assunto que apareceu sozinho | **resolvida por outro caminho** — é o que `/notas/agrupadas` faz, e nomear um território é criar um Estudo. Ver o teste acima |
| **Coleção** — agrupa itens na Estante | **esboço citado como norma** — a única menção em DEC é de desenho, não de entidade. Os recortes da Estante são filtros derivados, e não coleções: o buraco existe, a norma não |
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
| Em todos os aparelhos: … Marcadores · Para revisar `DEC-0023 §4` | **vigente desde 03/09** — "Para revisar" é recorte de `/notas`, e a §4 pede **capacidade** disponível a 390, não lugar: ela abre com *"estas CAPACIDADES existem no telefone"* e a lista mistura lugares (Mesa) com capacidades (Busca, Marcadores) |
| A 390px, uma indisponível é falha de V1 `DEC-0023 §4` | **vigente** para as construídas — medido: 390 de 390 em dez rotas |
| Canvas desktop-only no V1 `DEC-0023 §5` | **vigente** |
| Conexões no telefone como Relacionadas · Trilhas · Assuntos `DEC-0023 §6` | **descreve errado** — cita o §6 sem a ressalva que a própria `DEC-0023` escreve na lista de pendências: *"é ponto de partida para desenho, não especificação fechada"*. A citação transformou um esboço em espec |
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

**Um conflito** que é decisão do Erik, não trabalho: o lugar `Estudos`, que
existe no produto e não está entre os cinco da norma.

**E uma lição de método, que custou dois registros errados meus:** citar um §
sem ler a lista de pendências da mesma DEC transforma esboço em especificação.
A `DEC-0023 §6` parecia fechar o vocabulário de Conexões; a própria DEC dizia,
trinta linhas abaixo, que aquilo era ponto de partida para desenho.

Nenhuma foi consertada nesta passada. As que viram trabalho, viram item; as que
viram decisão, viram pergunta.
