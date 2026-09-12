/* A leitura também é uma gaveta, mas não uma janela com rolagem própria.
 *
 * O leitor mede a posição na janela para guardar progresso, carregar capítulos
 * acima e abaixo e devolver exatamente o trecho onde a pessoa parou. Uma
 * gaveta fixa com `overflow` criaria uma segunda rolagem e quebraria essas três
 * promessas. Por isso a Vaul fica em fluxo: continua sendo uma folha que pode
 * ser puxada pela alça, enquanto a página conserva a rolagem nativa. */
import { Drawer } from "vaul";
import { useNavigate } from "react-router-dom";
import { usarRestoVisivelParaQuemOuve } from "./GavetaDeSecao.jsx";
import "./gaveta-de-leitura.css";

export function GavetaDeLeitura({ titulo, voltarPara, children }) {
  const navegar = useNavigate();
  usarRestoVisivelParaQuemOuve();

  return (
    <main className="leitura-cena chao">
      <Drawer.Root
        open
        onOpenChange={(aberta) => { if (!aberta) navegar(voltarPara); }}
        direction="bottom"
        modal={false}
        shouldScaleBackground={false}
        /* Na leitura, arrastar o corpo precisa continuar sendo seleção de
         * texto. Só a alça visível fecha a gaveta; sem isto a Vaul captura o
         * pointerdown da prosa antes que o navegador forme o destaque. */
        handleOnly
        scrollLockTimeout={500}
      >
        <Drawer.Content className="leitura-gaveta" aria-label={titulo}>
          <Drawer.Title className="visualmente-oculto">{titulo}</Drawer.Title>
          <Drawer.Handle className="leitura-gaveta-alca" />
          {children}
        </Drawer.Content>
      </Drawer.Root>
    </main>
  );
}
