# DEC-0021 — Modelo de conteúdo do Mekora

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O Mekora não tem, hoje, definição normativa do que é um item da biblioteca. O protótipo executável indexa livros por título: `LIVROS` é um objeto cuja chave é o título (`prototipo-mesa.html:1858`), a pertinência de uma nota é `d.livro===ARQ.titulo` (`:2441`) e a chave da nota é `"d"+sig(lv)+cap+par` (`:2455`), onde `sig()` é uma redução do próprio título (`:2440`). O acervo de demonstração já expõe o limite dessa escolha: há dois itens "Malha Urbana" e dois "Ensaio Visual", distinguidos à mão pelas legendas "outra edição" (`:1841`) e "variante" (`:1843`). Duas edições do mesmo título colidem.

O produto também carrega uma hipótese arquitetural que nunca foi decidida: a de que o PDF de origem permanece como representação paralela do item. Dela nasceu a tríade Original/Adaptado/Comparar, implementada em `prototipo-mesa.html:2663` e `:2676`, onde o "original" é derivado do texto adaptado por regra fixa — quebra em 58 colunas, hifenização e folio a cada 14 linhas.

A DEC-0011 (aceita, 11/08) já havia nomeado a lacuna nas suas consequências: "O próximo marco técnico passa a ser o **modelo de livro persistente**: a entidade que `ProcessingJob` não é" (`DEC-0011-canonical-frontend-and-operational-api-contract.md:51`). Aquela DEC apontou o marco técnico e parou ali, porque o que faltava era uma resposta de produto. Esta decisão é essa resposta.

Nesta mesma sessão foi proposto a Erik um modelo de três níveis — Work → Edition → Representation. Ele o recusou explicitamente antes de desenhar o modelo que segue.

## Decisão

1. O Mekora **não adota** o modelo Work → Edition → Representation.

2. Existem **duas famílias de conteúdo**:

   ```
   CONTENT ITEM
   ├── Documento / Livro  → formato de leitura canônico: EPUB
   └── Quadrinho / Mangá  → formato de leitura visual/fixo
   ```

3. Para a família **Documento / Livro**, o Mekora normaliza documentos e livros para um formato canônico de leitura. Após conversão bem-sucedida e validada, o item persistido na biblioteca **é o EPUB responsivo**.

4. Para a família **Quadrinho / Mangá**, o item mantém uma representação apropriada a conteúdo visual/fixo.

5. **PDF e formatos semelhantes são fontes de ingestão temporárias.** Não são representação permanente do item na biblioteca.

6. **O PDF não é representação paralela do item.** Não há necessidade de mantê-lo ao lado do item persistido.

7. **Original/Adaptado/Comparar não é regra do produto.** A estrutura deixa de valer como arquitetura principal.

8. A ingestão é **transacional**, nesta ordem: PDF recebido → converter → validar EPUB → persistir EPUB → só então descartar o PDF temporário.

9. **O original não é descartado antes de a conversão estar validada.** Se a conversão falhar, o original ainda precisa estar disponível para retry.

10. **Cada item tem identidade estável própria.** Título não pode ser identidade.

11. Identidade derivada do título é **proibida**. `id = hash(título)` nunca é aceitável. Duas importações chamadas "Duna" não podem colidir só porque possuem o mesmo título.

## O que esta decisão NÃO decide

- **O formato exato do identificador.** Erik citou `content_id = UUID` como exemplo do tipo de coisa que serve, não como especificação. O formato fica em aberto.
- **Se guardar o original por outra razão é proibido.** A decisão 6 registra ausência de necessidade, não proibição. Pergunta fechada em aberto: *manter o PDF de origem depois de o EPUB validado ser persistido — por retry, auditoria ou obrigação legal — é proibido, ou apenas desnecessário?*
- **Por quanto tempo o original fica guardado antes do descarte.** Nenhum prazo foi decidido. Erik declarou a pendência ao reformular a pergunta de privacidade: "quanto tempo mantemos o original? onde os arquivos ficam? são criptografados? quem/processos podem acessá-los? o que é eliminado depois da conversão?". A pendência tem consequência jurídica e permanece aberta.
- **O que valida uma conversão como bem-sucedida.** A decisão exige validação antes de persistir e antes de descartar o original. O critério de validação não foi definido.
- **O que acontece com o item quando o usuário o remove da estante.** Não decidido: nem se o conteúdo persistido é apagado, nem em que prazo, nem o que resta da identidade do item.
- **Qual é o formato concreto da família Quadrinho / Mangá.** A decisão diz "representação apropriada a conteúdo visual/fixo" e não nomeia formato.
- **Quais formatos de entrada são aceitos** além de PDF. "Formatos semelhantes" não foi enumerado.
- **Onde os arquivos ficam, se são criptografados e quem os acessa.** Isso pertence ao modelo de privacidade e retenção a reconciliar, não a esta DEC.
- **Como relacionar duas importações do mesmo título.** A decisão proíbe colisão; não define agrupamento, metadado de edição nem deduplicação.
- **A migração do acervo e das notas existentes** para identidade estável.
- **Se a família Quadrinho / Mangá entra no MVP.** Esta DEC reconhece a família no modelo de conteúdo e não decide escopo; a DEC-0018 tampouco responde essa pergunta — ver consequência 4. Pergunta fechada em aberto: *quadrinho e mangá são conteúdo ingerível no MVP, ou só depois dele?*

## Consequências

1. **Original/Adaptado/Comparar perde a base arquitetural e pode ir para o histórico.** A feature está implementada em `prototipo-mesa.html:2663` (bloco `ORIGINAL, ADAPTADO, COMPARAR`) e `:2676` (`comoSaiuDoPDF`). Ela nasceu da hipótese de que o PDF original permaneceria como representação paralela; com as decisões 5 e 6, a hipótese cai. Erik: "eu não deixaria essa feature sobreviver só porque já foi prototipada. Pode ir para o histórico." Esta DEC não manda apagar código — retira o estatuto normativo: nada no produto deve ser desenhado a partir dessa tríade daqui em diante.

2. **A identidade por título passa a ser BUG conhecido se esta DEC for aceita.** Enquanto esta DEC estiver em estado "proposta", nenhuma norma vigente proíbe identidade por título, e a implementação atual não é bug — não há DEC aceita sobre modelo de conteúdo. Se esta DEC for aceita, passam a divergir das decisões 10 e 11, e a se registrar como BUG conhecido:
   - `prototipo-mesa.html:1858` — `LIVROS` indexado por título;
   - `prototipo-mesa.html:2441` — `noLivro=(d,cap,par)=>d.livro===ARQ.titulo&&...`, pertinência de nota resolvida por comparação de título;
   - `prototipo-mesa.html:2455` — chave da nota `"d"+sig(lv)+cap+par`, com `sig()` derivado do título em `:2440`.

   Consequência observável hoje, independente de aceitação: duas edições do mesmo título colidem, e o acervo já traz o caso anotado à mão em `:1841` ("outra edição") e `:1843` ("variante"). Aceita esta DEC, vale a distinção-mãe da governança — DEC vigente x implementação divergente = BUG, não conflito de autoridade —, e isto se registra como defeito a corrigir, não como disputa entre protótipo e norma. (A auditoria registrou estas ocorrências como `:1857`, `:2438` e `:2459`; o arquivo foi alterado desde então e as linhas verificadas hoje são as citadas acima.)

3. **A DEC-0011 recebe a resposta de produto que suas consequências pediam.** A DEC-0011 nomeou o "modelo de livro persistente" como próximo marco técnico e o descreveu como "a entidade que `ProcessingJob` não é". Esta DEC define o que essa entidade é do ponto de vista de produto: um item com duas famílias possíveis, formato canônico por família e identidade estável própria. Esta DEC não emenda nem substitui a DEC-0011: ela responde à pergunta de produto que as consequências dela deixaram aberta. O ponto 1 da DEC-0011 é emendado pela **DEC-0025**, proposta na mesma data; o conteúdo desta DEC não depende dele. Os demais pontos da DEC-0011 não são tocados por esta DEC.

4. **Modelo e escopo são coisas diferentes.** A DEC-0018 (aceita, 12/08) fixa o escopo do MVP em preparação e biblioteca, com Estante, Canvas e Conexões dentro — "a primeira versão inclui **preparação e biblioteca**. Estante, Canvas e Conexões entram; não são fase dois" (`DEC-0018-mekora-identity-and-mvp-scope.md:12-13`) — e põe fora do MVP a **tradução** de quadrinhos e mangás, não a família de conteúdo em si: "**Tradução:** entra no MVP e é uma das funcionalidades principais — para documentos de texto. **Fica de fora para quadrinhos e mangás**, onde a eficiência ainda não foi comprovada" (`:15-17`). Esta DEC reconhece a família Quadrinho/Mangá **no modelo de conteúdo**: reconhecer a família impede que o modelo seja desenhado como se só existisse texto refluível. Ela não decide se a família entra no MVP, e a DEC-0018 também não responde isso — fica registrada como pendência de escopo. O que a DEC-0018 decide sobre tradução de quadrinho continua vigente e não é tocado aqui.

5. **O fluxo de ingestão ganha norma verificável.** A decisão 8 fixa uma ordem e a decisão 9 fixa uma invariante: enquanto não houver EPUB validado e persistido, o original existe. Aceita esta DEC, qualquer implementação que descarte a fonte antes da validação a viola. Se o backend atual cumpre ou não essa ordem: não verificado.

6. **A pendência de retenção fica formalmente aberta e nomeada.** Sem prazo decidido, o produto não pode publicar promessa de descarte nem contrato de retenção. A pendência se conecta às cinco perguntas de privacidade e retenção registradas na **DEC-0022**, proposta na mesma data, e ao AUTH-001 (pendente), que declara não decidir nada sobre identidade e sessão. Registrado por honestidade: a decisão 8 desta DEC responde em parte a última daquelas cinco perguntas — diz *o quê* é eliminado depois da conversão, o PDF de origem, depois de o EPUB validado ser persistido. Não diz *quando*, nem onde o original ficou até lá, nem quem teve acesso.

7. **A tela de preparo é coerente com a decisão 8 quanto ao lugar do processamento.** Em `prototipo-mesa.html:2000` a resposta ao leitor diz "Pode. O preparo não é feito no seu computador." e em `:3179` o rodapé do preparo diz "Pode fechar a aba: o trabalho não é feito no seu computador.". O mesmo arquivo afirma "o produto é local" ao justificar recusas (`:6587`, `:6647`, `:6652`). Essa contradição interna é anterior a esta DEC e não é resolvida por ela: onde o produto roda é matéria da **DEC-0022**, proposta na mesma data.

## Histórico

O modelo **Work → Edition → Representation** foi proposto a Erik nesta mesma sessão, como forma clássica de separar a obra, suas edições e os arquivos concretos de cada edição. Ele o descartou na mesma sessão, com a razão de que era "sofisticado demais para um problema que vocês não querem ter". Fica registrado aqui para que ninguém reabra a discussão do zero: a ideia foi considerada e recusada, e a recusa é deliberada, não omissão.

O que ficou no lugar dele é mais raso de propósito: um item, duas famílias, um formato canônico por família e identidade própria — só o suficiente para impedir a colisão que já existe no acervo.

**Original/Adaptado/Comparar** foi construído antes desta decisão, a partir da hipótese oposta: a de que o PDF permaneceria disponível ao lado do texto refluído, e de que comparar as duas versões serviria para conferir se a conversão comeu alguma coisa. O código explicita essa intenção em `prototipo-mesa.html:2663`. A hipótese era razoável enquanto o PDF fosse representação permanente. Com a decisão 5, deixou de ser. Vale a regra da governança: protótipo é evidência de estado observado, nunca decisão normativa por si só.

**A identidade por título** também é anterior, e é escolha de protótipo, não de produto: `sig()` reduz o título a quatro caracteres alfanuméricos para compor a chave da nota (`:2440`, `:2455`). Funcionou enquanto o acervo era de demonstração e as duplicatas eram anotadas à mão. A DEC-0011 já apontava, em 11/08, que faltava a entidade persistente; esta DEC diz que ela precisa nascer com identidade própria.

Vale o enquadramento que Erik deu à rodada: "quero que a reconciliação preserve o caminho que levou ao produto atual, mas que a autoridade normativa descreva o Mekora que existe daqui para frente."
