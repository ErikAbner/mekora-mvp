# DEC-0029 — MVP e V1 são a mesma versão, e ela nasce observável

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

Duas palavras vinham sendo usadas para a mesma coisa sem que ninguém declarasse que eram a mesma
coisa. A DEC-0018, de 12/08, fixa o **escopo do MVP** — "a primeira versão inclui preparação e
biblioteca. Estante, Canvas e Conexões entram; não são fase dois" (`DEC-0018:12-13`). As decisões de
20/08 falam em **V1** ao tratar de mobile e de paridade de features.

Na indústria os dois termos não são sinônimos: MVP costuma nomear o mínimo que valida uma hipótese, e
V1 a primeira versão que se assume como produto. A auditoria registrou o descompasso como pergunta
aberta na DEC-0023, porque um requisito escrito para "V1" não tem endereço se V1 não existe como
conceito definido no projeto.

Não há problema em os dois termos coincidirem. Há problema em coincidirem por acidente.

## Decisão

1. **Para o Mekora, "MVP" e "V1" nomeiam a mesma coisa:** a primeira versão pública entregue a
   usuários reais. Os dois termos podem ser usados; referem-se ao mesmo alvo.

2. **A V1 é deliberadamente observável.** Instrumentação, eventos, erros, abandono de fluxo e
   comportamento de uso **fazem parte dos requisitos da versão**, e não de uma fase posterior. Uma V1
   que funcione e não meça não cumpre esta decisão.

3. **A V1 nasce preparada para responder, com dado e não com opinião:**

   - onde as pessoas abandonam;
   - o que usam;
   - o que nunca usam;
   - em que etapa a conversão quebra;
   - onde o Reader perde a pessoa;
   - que caminhos percorrem entre Mesa, Estante, Notas, Canvas e Conexões.

4. **A instrumentação obedece à DEC-0020**, que continua vigente: mede a interface e nunca o
   conteúdo.

## O que esta decisão NÃO decide

- **O que entra no escopo da V1.** Isso é matéria da DEC-0018 e das decisões de 20/08, não desta.
  Esta DEC declara que os dois nomes apontam para o mesmo alvo; não redefine o alvo.
- **Que eventos são coletados**, com que granularidade, e por quanto tempo são mantidos.
- **Qual ferramenta de instrumentação é usada**, e se ela é própria — a DEC-0022 item 7 fixa o limite
  para tradução e IA, não para telemetria de interface.
- **Se há consentimento para a coleta, e como ele é pedido.** A DEC-0020 diz o que pode ser medido;
  não diz como se pergunta.
- **Que número, em qualquer dessas medidas, conta como sucesso ou fracasso.** Fixar meta antes de ter
  linha de base seria inventar o critério.
- **Quando a V1 é lançada.**

## Consequências

1. **A pergunta aberta da DEC-0023 fica respondida.** Requisitos escritos para "V1" — Estante,
   Reader, busca, highlights, notas e revisão a 390px — incidem sobre o mesmo escopo que a DEC-0018
   chama de MVP.

2. **A instrumentação sai da fila do "depois".** O `capability_snapshot` de `projects/mekora.json`
   registra métricas como `operational` no app operacional, mas a auditoria apurou que a
   instrumentação de interface prevista pela DEC-0020 tem **nenhum dado coletado e nenhuma
   implementação**. O item 2 a transforma em requisito da versão.

3. **Quatro recomendações de produto que estavam presas a medição ganham caminho.** A auditoria
   registrou que decisões de Mesa, densidade e navegação carregam cláusulas suspensivas do tipo "se a
   medição mostrar X" — e que a medição nunca pôde acontecer. Com a V1 observável, elas passam a ter
   data possível.

4. **A ordem dos cinco lugares deixa de precisar de opinião.** A DEC-0024 registra que a ordem não
   está decidida. Os itens 3 e 4 desta DEC produzem exatamente o dado — frequência de acesso,
   transições mais comuns, sequência de uso — que permite decidir por evidência.

5. **A DEC-0020 ganha aplicação concreta.** Ela fixou como medir, com quatro limites vinculantes, e
   ficou sem sujeito por oito dias. Esta DEC dá o sujeito.

## Histórico

O projeto tem uma regra de ofício, formulada em 12/08 e aplicada desde então: **confiança só quando
existe medição; sem medição, o produto pergunta.** Ela nasceu quando uma pendência do caderno 03 foi
reescrita para tirar uma confiança declarada que não tinha número por trás.

A mesma disciplina já existia antes com outro nome, e se perdeu. Os relatórios de teste de
24/07/2026, resgatados de um cache e preservados em `resgate/2026-07-24-kindle-local/`, marcam cada
afirmação com a origem da evidência — `[V]` verificado em execução, `[C]` lido no código, `[H]`
hipótese sem participantes, `[R]` recomendação — e abrem declarando: *"Não houve participantes
humanos. Nenhum número de compreensão ou tempo neste documento é medição."*

A ideia foi encontrada duas vezes, por caminhos independentes, com três semanas de distância. É o
primeiro caso confirmado do padrão que Erik nomeou como **princípio recorrente**, e o argumento mais
forte a favor do item 2: a única coisa que faltou às duas vezes foi um produto que medisse sozinho.
