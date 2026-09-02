/* A gaveta: uma seção que SOBREPÕE o que estava na tela, sem trocar de tela.
 *
 * POR QUE ELA EXISTE, e o que eu tinha entendido errado
 * =====================================================
 * O desenho tem um chão pontilhado, e sobre ele contêineres de outra cor. Eu li
 * cada um desses contêineres como uma PÁGINA e construí uma rota para cada.
 * Não são: são seções que se abrem POR CIMA do que estava ali, seguindo a mesma
 * lógica de navegação de dentro do canvas — o chão continua, e o que muda é o
 * que está aberto em cima dele.
 *
 * A diferença não é estética. Uma rota TROCA a tela: o que estava aberto some,
 * a rolagem volta ao topo, e voltar é uma ida ao histórico. Uma gaveta deixa o
 * que estava embaixo onde estava, e fechar devolve exatamente aquilo.
 *
 * A BASE É A `vaul`, do Emil Kowalski, indicada pelo Erik. Ela resolve o que é
 * difícil e quase sempre fica pela metade em gaveta feita à mão:
 *
 *   - arrastar para fechar, com VELOCIDADE e não só distância: um peteleco
 *     rápido fecha, mesmo sem percorrer o caminho todo
 *   - atrito ao passar do limite, em vez de parede invisível
 *   - captura do ponteiro, para o arrasto continuar quando o dedo sai de cima
 *   - o toque adicional é ignorado depois que o arrasto começou, senão trocar
 *     de dedo no meio faz a gaveta pular
 *   - foco preso enquanto aberta, `Esc` fecha, resto da página inerte
 *
 * O QUE SAI DO VISUAL PADRÃO DELA, e por quê
 * ==========================================
 * A `vaul` desenha uma gaveta de telefone: cantos arredondados em cima, alça
 * cinza no meio, sombra. O Mekora não tem raio, não tem sombra e não tem alça —
 * a superfície é degrau de cor e filete de 1px. Então o CSS zera o visual dela e
 * mantém só a mecânica. O Erik disse isso com todas as letras: "vai precisar
 * remover bordas e tudo mais, porém é um componente pensado para ser assim".
 *
 * A DIREÇÃO VEM DE QUEM ABRE, e o padrão é `bottom`. Qual gaveta vem de onde é
 * decisão do desenho, e está anotada em cada chamada — não aqui.
 */
import { Drawer } from "vaul";
import "./gaveta.css";

export function Gaveta({
  aberta,
  aoFechar,
  titulo,
  de = "bottom",
  children,
  /* `alca` liga a barrinha de arrastar. Ela é falsa por padrão porque no
   * desktop não existe gesto de arrastar gaveta — a alça ali é enfeite que
   * promete uma interação que ninguém vai fazer. */
  alca = false,
}) {
  return (
    <Drawer.Root
      open={aberta}
      onOpenChange={(v) => { if (!v) aoFechar?.(); }}
      direction={de}
      /* O fundo NÃO encolhe. O `shouldScaleBackground` é o efeito de cartão do
       * iOS, e aqui embaixo há um chão pontilhado com conteúdo posicionado:
       * encolher tudo faria o chão pular de escala a cada abertura. */
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="gaveta-fundo" />
        <Drawer.Content className={`gaveta gaveta-de-${de}`} aria-label={titulo}>
          {alca && <Drawer.Handle className="gaveta-alca" />}
          {/* O título é anunciado, e nem sempre desenhado: algumas seções já têm
              o próprio cabeçalho, e dois títulos seguidos é o leitor de tela
              lendo a mesma coisa duas vezes. */}
          <Drawer.Title className="visualmente-oculto">{titulo}</Drawer.Title>
          <div className="gaveta-conteudo">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
