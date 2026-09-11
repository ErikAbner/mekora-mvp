/* A seção que se abre por cima do chão — e que se ARRASTA para fechar.
 *
 * A primeira versão desenhou a folha certa e parou aí: moldura, sombra, medidas
 * do `895:10650`, e uma entrada de 260ms. O que faltava era o gesto. O Erik
 * confirmou o que a `vaul` está aqui para fazer: puxar a Conta para baixo é
 * voltar para onde ela se abriu.
 *
 * NÃO É MODAL, e essa é a diferença que mais importa.
 *
 * O `895:10599` mostra o cabeçalho vivo com a Conta aberta — dá para clicar em
 * Mesa ou em Canvas dali. Uma gaveta modal prenderia o foco dentro e deixaria o
 * resto da página inerte, o que tornaria o cabeçalho decoração. `modal={false}`
 * mantém tudo alcançável, e é o que faz a coisa ser uma SEÇÃO sobreposta em vez
 * de um diálogo.
 *
 * SEM ESCURECER O FUNDO, pela mesma razão: o chão pontilhado aparece inteiro no
 * desenho. Escurecer diria "o que está atrás está desligado", e não está.
 *
 * FECHAR É VOLTAR. Quem arrasta para baixo, aperta `Esc`, ou clica fora volta
 * para o lugar do rastro — a Estante, se foi de lá que veio. Não é `history.back`
 * porque a pessoa pode ter chegado por link, e aí não há atrás nenhum.
 */
import { useEffect } from "react";
import { Drawer } from "vaul";
import { useNavigate } from "react-router-dom";
import { lugarDoRastro } from "../lugares.js";
import "./gaveta-de-secao.css";

/* DESFAZ O `aria-hidden` QUE O RADIX PÕE NO RESTO DA PÁGINA.
 *
 * A `vaul` tem `modal={false}` e ela NÃO repassa isso ao Radix: em
 * `vaul/dist/index.js` o `Dialog.Root` recebe só `defaultOpen`, `onOpenChange` e
 * `open`. O Radix então assume modal, chama `hideOthers`, e marca todo o resto
 * da página com `aria-hidden="true"`.
 *
 * O EFEITO É A PIOR INCONSISTÊNCIA POSSÍVEL: o cabeçalho continua clicável pelo
 * mouse — o desenho o quer vivo, `895:10599` — e DESAPARECE para quem usa leitor
 * de tela. Não é "menos acessível": é a interface dizendo duas coisas
 * diferentes para duas pessoas.
 *
 * QUEM DENUNCIOU FOI O PORTÃO, e não por uma regra sua. Ele pula subárvore
 * `aria-hidden`, e a contagem de nós medidos caiu de 49 para 14 na mesma tela.
 * A tela continuava PASSANDO — medindo um terço de si mesma.
 *
 * O pacote `aria-hidden`, que o Radix usa, marca o que escondeu com
 * `data-aria-hidden`. É por aí que se desfaz, e só o que ele mesmo marcou. O
 * observador existe porque ele reaplica a cada abertura.
 */
export function usarRestoVisivelParaQuemOuve() {
  useEffect(() => {
    const limpar = () => {
      for (const el of document.querySelectorAll("[data-aria-hidden]")) {
        if (el.getAttribute("aria-hidden") === "true") el.removeAttribute("aria-hidden");
      }
    };
    limpar();
    const olho = new MutationObserver(limpar);
    olho.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["aria-hidden"] });
    return () => olho.disconnect();
  }, []);
}

export function GavetaDeSecao({ titulo, children, voltarPara = null, classe = "" }) {
  const navegar = useNavigate();
  usarRestoVisivelParaQuemOuve();

  function fechar() {
    navegar(voltarPara ?? lugarDoRastro()?.rota ?? "/estante");
  }

  return (
    <Drawer.Root
      open
      onOpenChange={(v) => { if (!v) fechar(); }}
      direction="bottom"
      modal={false}
      /* O fundo NÃO encolhe: embaixo há um chão pontilhado, e encolher tudo
       * faria os pontos pularem de escala a cada abertura. */
      shouldScaleBackground={false}
      /* Rolar dentro da folha não pode virar arrasto. Meio segundo depois da
       * última rolagem o gesto volta a valer — é o padrão da `vaul`, e está
       * escrito aqui porque é ele que impede a folha de fugir quando a pessoa
       * rola rápido até o fim. */
      scrollLockTimeout={500}
    >
      {/* SEM `Drawer.Portal`, e a razão é medida.
        *
        * Com o portal, a `vaul` põe `aria-hidden="true"` no `#raiz` mesmo com
        * `modal={false}` — ela usa o `Dialog` do Radix por baixo, e ele esconde
        * o lado de fora. O efeito é o pior tipo de inconsistência: o cabeçalho
        * continua clicável pelo mouse e DESAPARECE para quem usa leitor de tela.
        *
        * Quem denunciou foi o portão, e não pela regra dele: ele pula subárvore
        * `aria-hidden`, e a contagem de nós medidos caiu de 49 para 14 na mesma
        * tela. A tela continuava passando — medindo um terço dela. */}
      <Drawer.Content className={`gaveta-secao${classe ? ` ${classe}` : ""}`} aria-label={titulo}>
        <Drawer.Title className="visualmente-oculto">{titulo}</Drawer.Title>
        {/* A ALÇA: esta gaveta se arrasta, e o gesto precisa de onde pegar. Sem
            ela, arrastar é um segredo. */}
        <Drawer.Handle className="gaveta-secao-alca" />
        <div className="gaveta-secao-conteudo">{children}</div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
