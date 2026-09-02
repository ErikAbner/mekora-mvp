/* Todos os lugares do produto, agrupados — e um lugar só onde eles moram.
 *
 * POR QUE ISTO EXISTE. A lista estava escrita à mão dentro do `Rodape.jsx`, e o
 * telefone passou a precisar da MESMA lista: o nó 964:24606 põe um hambúrguer ao
 * lado da busca, e o que ele abre é justamente o que não cabe na barra de baixo.
 *
 * Duas cópias da mesma lista é como o menu passa a oferecer um lugar que o
 * rodapé não tem — e, pior, como um link morto sobrevive num dos dois. O
 * `lugares.js` já resolve isso para os quatro lugares principais; isto resolve
 * para o resto.
 *
 * `LUGARES` NÃO É REPETIDO AQUI: os quatro principais vêm de lá, montados na
 * hora, para que um lugar novo apareça nos dois sem ninguém lembrar.
 */
import { LUGARES } from "./lugares.js";

export function gruposDeLugares() {
  return [
    {
      titulo: "No Mekora",
      itens: [
        ...LUGARES.filter((l) => l.pronto).map((l) => ({ rota: l.rota, rotulo: l.rotulo })),
        { rota: "/notas", rotulo: "Notas" },
      ],
    },
    {
      /* Ajuda e Atualizações são públicas, então ficam fora da coluna da conta:
         quem não entrou também precisa delas. */
      titulo: "O produto",
      itens: [
        { rota: "/apresentacao", rotulo: "O que é o Mekora" },
        { rota: "/ajuda", rotulo: "Ajuda" },
        { rota: "/atualizacoes", rotulo: "Atualizações" },
        { rota: "/politica-de-privacidade", rotulo: "Política de privacidade" },
        { rota: "/termos-de-uso", rotulo: "Termos de uso" },
        /* O ÚNICO ITEM QUE NÃO É LUGAR. Ele abre a folha de recado por cima da
           tela em que a pessoa está, e é de propósito: o recado leva junto ONDE
           ela estava, e uma rota própria perderia isso e ainda a tiraria de
           onde ela queria falar. Quem desenha a lista trata `acao` como botão;
           `rota`, como link. */
        { acao: "recado", rotulo: "Deixar um recado" },
      ],
    },
    {
      titulo: "Sua conta",
      itens: [
        /* "Dispositivos Kindle" APONTAVA PARA `/conta`, que é a visão geral.
           O rótulo ficou de quando não existia tela de aparelhos, e sobreviveu à
           criação dela: quem clicava esperando os Kindles caía na conta. */
        { rota: "/conta", rotulo: "Sua conta" },
        { rota: "/conta/kindle", rotulo: "Dispositivos Kindle" },
        { rota: "/conta/seguranca", rotulo: "Segurança" },
        { rota: "/conta/preferencias", rotulo: "Preferências" },
        { rota: "/conta/privacidade", rotulo: "Privacidade" },
      ],
    },
  ];
}
