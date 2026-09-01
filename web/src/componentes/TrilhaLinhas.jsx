/* A navegação por linhas — o `LineSidebar` do React Bits, adaptado.
 *
 * O Erik trouxe o componente e disse onde ele vive: é a navegação da estante em
 * 3D e "a maior parte das navegações do projeto". A `.pilha-indice` que eu tinha
 * escrito à mão era uma aproximação dele — traços de comprimento fixo e nenhuma
 * resposta ao cursor.
 *
 * O QUE MUDOU EM RELAÇÃO AO ORIGINAL, e por quê:
 *
 * 1 · A COR SAI DO SISTEMA. O padrão dele é `#A855F7`, um roxo, e a regra aqui
 *     é que cor é objetivo — não há matiz em elemento de interface. O realce
 *     usa `--foreground` sobre `--muted-foreground`, que é o mesmo par de
 *     ativo/inativo do resto do produto.
 *
 * 2 · O ÍNDICE NUMÉRICO SAI POR PADRÃO. Numerar "01 Overview" faz sentido numa
 *     lista de seções de documentação; numa estante, o número da posição de um
 *     livro na pilha não é informação — ele muda quando outro livro entra.
 *
 * 3 · O ITEM VIRA `<button>`, e não `<li onClick>`. O original não é alcançável
 *     por teclado: sem foco e sem tecla, a estante inteira deixa de existir para
 *     quem não usa mouse. Aqui cada item é um botão de verdade dentro do `li`.
 *
 * 4 · `prefers-reduced-motion` desliga o laço. O efeito é decorativo, e um
 *     `requestAnimationFrame` contínuo respondendo ao cursor é exatamente o que
 *     essa preferência existe para evitar.
 *
 * O QUE FOI MANTIDO: o laço único de `rAF` com suavização exponencial
 * independente de quadro. A razão está no comentário do autor e é boa — com
 * transições de CSS por propriedade, cor, deslocamento e escala chegam em
 * tempos diferentes e o conjunto "descasa".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import "./trilha-linhas.css";

const CURVAS = {
  linear: (p) => p,
  suave: (p) => p * p * (3 - 2 * p),
  seca: (p) => p * p * p,
};

export function TrilhaLinhas({
  itens = [],
  aoEscolher,
  ativo = null,
  mostrarIndice = false,
  raio = 100,
  deslocamento = 24,
  curva = "suave",
  comprimento = 60,
  vao = 0,
  escalaDoRisco = 0.5,
  entreItens = 20,
  suavizacao = 100,
  rotulo = "Navegação",
  className = "",
}) {
  const lista = useRef(null);
  const nos = useRef([]);
  const alvos = useRef([]);
  const atuais = useRef([]);
  const quadro = useRef(null);
  const ultimo = useRef(0);
  const ativoRef = useRef(ativo);
  const suavRef = useRef(suavizacao);
  const [aqui, setAqui] = useState(ativo);

  ativoRef.current = aqui;
  suavRef.current = suavizacao;

  /* Um laço só, que aproxima o `--efeito` de cada item do seu alvo. A
   * suavização é exponencial e independente da taxa de quadros: num monitor de
   * 120Hz e num de 60 o movimento leva o mesmo tempo. */
  const passo = useCallback((agora) => {
    const dt = Math.min((agora - ultimo.current) / 1000, 0.05);
    ultimo.current = agora;
    const tau = Math.max(suavRef.current, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    let andando = false;
    for (let i = 0; i < nos.current.length; i++) {
      const el = nos.current[i];
      if (!el) continue;
      const alvo = Math.max(alvos.current[i] || 0, ativoRef.current === i ? 1 : 0);
      const cur = atuais.current[i] || 0;
      const prox = cur + (alvo - cur) * k;
      const parou = Math.abs(alvo - prox) < 0.0015;
      const valor = parou ? alvo : prox;
      atuais.current[i] = valor;
      el.style.setProperty("--efeito", valor.toFixed(4));
      if (!parou) andando = true;
    }

    quadro.current = andando ? requestAnimationFrame(passo) : null;
  }, []);

  const comecar = useCallback(() => {
    if (quadro.current != null) cancelAnimationFrame(quadro.current);
    ultimo.current = performance.now();
    quadro.current = requestAnimationFrame(passo);
  }, [passo]);

  /* QUEM PEDIU MENOS MOVIMENTO NÃO RECEBE O LAÇO. O efeito é decorativo, e um
   * rAF contínuo respondendo ao cursor é o caso exato que essa preferência
   * existe para evitar. O item ativo continua marcado — pela cor, que não se
   * move. */
  const quieto = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    quieto.current = !!mq?.matches;
    const ouvir = (e) => { quieto.current = e.matches; };
    mq?.addEventListener?.("change", ouvir);
    return () => mq?.removeEventListener?.("change", ouvir);
  }, []);

  const aoMover = useCallback(
    (e) => {
      if (quieto.current) return;
      const el = lista.current;
      if (!el) return;
      const caixa = el.getBoundingClientRect();
      const y = e.clientY - caixa.top;
      const suavizar = CURVAS[curva] ?? CURVAS.linear;
      for (let i = 0; i < nos.current.length; i++) {
        const item = nos.current[i];
        if (!item) continue;
        const centro = item.offsetTop + item.offsetHeight / 2;
        alvos.current[i] = suavizar(Math.max(0, 1 - Math.abs(y - centro) / raio));
      }
      comecar();
    },
    [curva, raio, comecar],
  );

  const aoSair = useCallback(() => {
    alvos.current = alvos.current.map(() => 0);
    comecar();
  }, [comecar]);

  useEffect(() => { setAqui(ativo); }, [ativo]);
  useEffect(() => { comecar(); }, [aqui, comecar]);
  useEffect(() => () => {
    if (quadro.current != null) cancelAnimationFrame(quadro.current);
    quadro.current = null;
  }, []);

  return (
    <nav
      className={`trilha-linhas${className ? ` ${className}` : ""}`}
      aria-label={rotulo}
      style={{
        "--risco": `${comprimento}px`,
        "--vao": `${vao}px`,
        "--escala-risco": escalaDoRisco,
        "--desloca": `${deslocamento}px`,
        "--entre": `${entreItens}px`,
      }}
    >
      <ul ref={lista} onPointerMove={aoMover} onPointerLeave={aoSair}>
        {itens.map((item, i) => {
          const texto = typeof item === "string" ? item : item.rotulo;
          return (
            <li
              key={`${texto}-${i}`}
              ref={(el) => { nos.current[i] = el; }}
            >
              {/* `<button>` E NÃO `<li onClick>`: o original não é alcançável
                  por teclado, e sem foco nem tecla a navegação inteira deixa de
                  existir para quem não usa mouse. */}
              <button
                type="button"
                aria-current={aqui === i ? "true" : undefined}
                onClick={() => { setAqui(i); aoEscolher?.(i, item); }}
                onFocus={() => { alvos.current[i] = 1; comecar(); }}
                onBlur={() => { alvos.current[i] = 0; comecar(); }}
              >
                <span className="risco" aria-hidden="true" />
                <span className="rotulo">
                  {mostrarIndice && (
                    <span className="indice">{String(i + 1).padStart(2, "0")}</span>
                  )}
                  <span className="texto">{texto}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
