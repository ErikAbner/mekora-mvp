# DEC-0021 — Modelo de conteúdo do Mekora

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O Mekora não tem definição normativa do que é um item da biblioteca. O protótipo executável indexa
livros por título: `LIVROS` é um objeto cuja chave é o título (`prototipo-mesa.html:1858`), a
pertinência de uma nota é `d.livro===ARQ.titulo` (`:2441`), e a chave da nota é
`"d"+sig(lv)+cap+par` (`:2455`), onde `sig()` é uma redução do próprio título (`:2440`). O acervo
de demonstração já expõe o limite: há dois "Malha Urbana" e dois "Ensaio Visual", distinguidos à
mão pelas legendas "outra edição" (`:1841`) e "variante" (`:1843`). Duas edições do mesmo título
colidem.

O produto também carrega uma hipótese arquitetural que nunca foi decidida: a de que o PDF de origem
permanece como representação paralela do item. Dela nasceu a tríade Original/Adaptado/Comparar,
implementada em `:2663` e `:2676`, onde o "original" é derivado do texto adaptado por regra fixa.

A DEC-0011 nomeou a lacuna nas suas consequências — "O próximo marco técnico passa a ser o
**modelo de livro persistente**: a entidade que `ProcessingJob` não é"
(`DEC-0011-canonical-frontend-and-operational-api-contract.md:51`). Apontou o marco e parou ali,
porque o que faltava era resposta de produto. Esta decisão é essa resposta.

## Decisão

### As famílias de conteúdo

1. Existem **duas famílias canônicas**, e nenhuma é forçada ao formato da outra por uniformidade:

   ```
   Conteúdo textual      →  EPUB responsivo
   Quadrinho / Mangá     →  conteúdo visual responsivo apropriado ao formato
   ```

2. **Quadrinho e mangá entram no MVP.** São conteúdo ingerível e legível na primeira versão.

3. O Mekora **não adota** o modelo Work → Edition → Representation.

### O que se lê, e o que persiste

4. Para **conteúdo textual**, o Mekora normaliza a entrada para um formato canônico de leitura.
   O item persistido na biblioteca é o **EPUB responsivo**.

5. **O original importado não é persistido depois de uma conversão validada.** Ele existe
   temporariamente durante upload, conversão, retry e validação. Depois disso é eliminado.

6. **Na biblioteca não existe PDF paralelo ao EPUB.** Um item não carrega duas representações
   concorrentes do mesmo conteúdo.

7. **Original/Adaptado/Comparar não é regra do produto.** A estrutura deixa de valer como
   arquitetura principal.

8. A ingestão é **transacional**:

   ```
   entrada recebida
        ↓
   conversão
        ↓
   validação
        ├── falhou  →  o original continua disponível para retry
        └── passou  →  o formato canônico persiste, o original temporário é eliminado
   ```

### O que conta como conversão bem-sucedida

9. Uma conversão é bem-sucedida quando cumpre as **quatro dimensões**:

   | | critério |
   |---|---|
   | **Validade** | o pacote gerado é tecnicamente válido |
   | **Completude** | todo conteúdo extraível foi representado, sem perda estrutural grave |
   | **Legibilidade** | texto e imagens permanecem legíveis, sem corte ou overflow, nos tamanhos suportados |
   | **Estrutura** | ordem de leitura, capítulos, parágrafos e imagens continuam identificáveis |

10. Existe o resultado **"concluída com avisos"**. Uma conversão que passa nas quatro dimensões mas
    tem qualidade reduzida em algum ponto — OCR de baixa confiança, por exemplo — é declarada como
    tal. O produto não finge que foi perfeita.

11. **O que se preserva é conteúdo e estrutura semântica, não apresentação.** Preservar tudo não
    significa preservar cada quebra ruim do PDF de origem. A transformação de apresentação rígida em
    apresentação maleável é o trabalho, não um efeito colateral.

### Identidade

12. **Cada item tem identidade estável própria.** Título não pode ser identidade.

13. Identidade derivada do título é **proibida**. `id = hash(título)` nunca é aceitável. Duas
    importações chamadas "Duna" não podem colidir só porque possuem o mesmo título.

### Arquivar e excluir

14. **Arquivar e excluir são atos diferentes.**

    - **Arquivar** tira o livro da biblioteca ativa sem destruir conhecimento.
    - **Excluir permanentemente** remove o arquivo e os destaques que dependem dele.

15. **As notas escritas pela pessoa sobrevivem à exclusão, por padrão**, com a origem marcada como
    removida. Elas são trabalho intelectual de quem escreveu, e não simples derivado do arquivo.

## O que esta decisão NÃO decide

- **O formato do identificador.** Erik citou `content_id = UUID` como exemplo do tipo de coisa que
  serve, não como especificação.
- **Qual é o formato concreto do conteúdo visual responsivo** da família Quadrinho/Mangá.
- **Quais formatos de entrada são aceitos.** "Conteúdo textual" e "quadrinho/mangá" nomeiam famílias
  de destino, não a lista de extensões de origem.
- **Por quanto tempo o original temporário sobrevive** entre a falha de conversão e o descarte, nem
  quantos retries são oferecidos.
- **Os limiares de cada dimensão do item 9.** "Perda estrutural grave" e "tamanhos suportados"
  precisam de valores medidos, e a instrumentação que os mediria ainda não existe.
- **Quais avisos são possíveis** no resultado "concluída com avisos", nem como aparecem na tela.
- **Como relacionar duas importações do mesmo título.** A decisão proíbe colisão; não define
  agrupamento, metadado de edição nem deduplicação.
- **A migração do acervo e das notas existentes** para identidade estável.
- **O que acontece com uma nota órfã** depois que sua origem é excluída: se continua buscável, onde
  aparece na lista, e se a pessoa pode reconectá-la a um item reimportado.

## Consequências

1. **Original/Adaptado/Comparar perde a base arquitetural.** A feature está em
   `prototipo-mesa.html:2663` e `:2676`. Nasceu da hipótese de que o PDF permaneceria como
   representação paralela; com os itens 5 e 6, a hipótese cai. Esta DEC não manda apagar código —
   retira o estatuto normativo: nada deve ser desenhado a partir dessa tríade daqui em diante.

2. **A identidade por título passa a ser BUG conhecido se esta DEC for aceita.** Divergem dos itens
   12 e 13: `:1858` (`LIVROS` indexado por título), `:2441` (pertinência por comparação de título) e
   `:2455` (chave da nota derivada do título). Enquanto o estado for "proposta", nenhuma norma
   vigente proíbe identidade por título e a implementação não é bug.

3. **A DEC-0018 não é contrariada.** Ela põe fora do MVP a *tradução* de quadrinhos e mangás
   (`DEC-0018:15-17`), não a família de conteúdo. O item 2 desta DEC admite quadrinho e mangá como
   conteúdo ingerível no MVP; a tradução deles continua fora, por decisão que permanece vigente.

4. **A DEC-0011 recebe a resposta de produto que suas consequências pediam.** Esta DEC define o que
   é o "modelo de livro persistente" do ponto de vista de produto. Não emenda nem substitui a
   DEC-0011; o ponto 1 daquela DEC é emendado pela DEC-0025, proposta na mesma data.

5. **O fluxo de ingestão ganha norma verificável.** O item 8 fixa uma ordem e o item 5 fixa uma
   invariante: enquanto não houver formato canônico validado e persistido, o original existe.
   Qualquer implementação que descarte a fonte antes da validação viola esta DEC. Se o backend atual
   cumpre essa ordem: não verificado.

6. **A retenção do original deixa de ser pendência aberta e passa a ter regra.** O item 5 responde
   a primeira das cinco perguntas de privacidade que a DEC-0022 registra: o original é temporário.
   O prazo entre falha e descarte continua sem número.

7. **A biblioteca precisa de dois atos distintos na interface.** O item 14 exige que arquivar e
   excluir não compartilhem o mesmo controle nem a mesma confirmação. Hoje o protótipo não
   implementa a distinção: não verificado se existe algum ato de remoção.

8. **A promessa de que a nota sobrevive ao arquivo é agora norma.** O item 15 tem consequência
   técnica direta: a nota não pode ser armazenada como filha do arquivo. Precisa de existência
   própria e de referência resolvível, incluindo o caso em que o alvo não existe mais.

## Histórico

Nesta mesma sessão foi proposto um modelo de três níveis — Work → Edition → Representation. Erik o
recusou: *"Com o que você explicou, esse modelo ficou sofisticado demais para um problema que vocês
não querem ter."* O argumento dele foi que a biblioteca não precisa saber PDF original, EPUB
convertido, OCR e versão adaptada — precisa saber *"este é o conteúdo que eu leio"*, e os estados
intermediários do pipeline não fazem parte do modelo mental de quem usa.

Uma versão anterior desta proposta escrevia o item 5 como proibição de o original existir. Erik
corrigiu: a formulação correta é que ele **não é persistido depois de uma conversão validada** —
durante upload, conversão, retry e validação ele precisa poder existir, ou a recuperação de falha
fica impossível.

A família Quadrinho/Mangá foi reconhecida no modelo antes de o escopo estar claro. A auditoria de
20/08 apurou depois que a DEC-0018 nunca excluíra quadrinhos do MVP — excluíra a tradução deles —,
e Erik então decidiu a inclusão explícita no item 2.
