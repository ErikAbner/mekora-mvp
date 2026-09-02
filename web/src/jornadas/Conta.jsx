/* Conta — preferências.
 *
 * Vem do nó 895:10715. É a primeira tela que testa se os componentes do design
 * system servem, e a resposta está em DESVIOS.md: **não servem para esta**. Ela
 * é feita de seis grupos de escolha, e não existe rádio, caixa de marcar nem
 * interruptor entre os onze componentes construídos.
 *
 * As preferências são DERIVADAS de um estado só, e cada uma diz o que muda. A
 * regra do produto vale aqui como em qualquer lugar: o produto diz o que faz, e
 * não promete o que não faz — "Vale para os próximos arquivos. Nada muda no que
 * já está preparado ou em preparo" é a frase do desenho, e ela é boa porque pode
 * ser desmentida.
 */
import { useEffect, useState } from "react";
import { gravarPreferencias, lerPreferencias } from "../../../contrato/api.js";
import { aplicarTema } from "../estado/tema.js";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Escolha } from "../componentes/Escolha.jsx";
import { MenuDaConta } from "../componentes/MenuDaConta.jsx";
import { GRUPOS, PADROES } from "../preferencias.js";
import "./conta.css";

/* As preferências que AINDA NÃO TÊM EFEITO.
 *
 * Guardar uma escolha que não muda nada é o mesmo placeholder com outro nome: a
 * pessoa decide, o produto grava, e nada acontece — o que é pior que não
 * oferecer, porque parece que ela é quem entendeu errado.
 *
 * A escolha é guardada de qualquer forma, para não se perder quando o efeito
 * chegar. O que muda é a tela dizer.
 */
const SEM_EFEITO_AINDA = new Set(["dicas", "quando-pronto", "formato", "movimento"]);

export function Conta({ pessoa , aoSair }) {
  const [pref, setPref] = useState(PADROES);
  const [erro, setErro] = useState(null);

  /* As escolhas vinham de `useState(PADROES)` e morriam ao recarregar: a tela
   * respondia ao clique, mostrava a marcação, e esquecia tudo. */
  useEffect(() => {
    let vivo = true;
    lerPreferencias()
      .then((r) => {
        if (!vivo || !r?.escolhas) return;
        setPref((p) => ({ ...p, ...r.escolhas }));
        /* O SERVIDOR CORRIGE O ESPELHO. Ele é a verdade — é dele que a escolha
         * vem em outro aparelho —, e o `localStorage` só existe para a primeira
         * tela não piscar. */
        if (r.escolhas.tema) aplicarTema(r.escolhas.tema);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const escolher = (id, valor) => {
    const antes = pref;
    setPref((p) => ({ ...p, [id]: valor }));
    /* O tema muda NA HORA, antes de o servidor confirmar: é a única preferência
     * cujo efeito a pessoa vê imediatamente, e esperar a rede para trocar de
     * cor faria o clique parecer que não pegou. Se a gravação falhar, o
     * `catch` abaixo devolve tudo — inclusive o tema. */
    if (id === "tema") aplicarTema(valor);
    /* Volta ao que era se o servidor recusar. Deixar a marcação nova numa
     * escolha que não foi gravada é a tela afirmando algo que não é verdade —
     * e a pessoa só descobre na próxima visita. */
    gravarPreferencias({ [id]: valor }).catch((e) => {
      setPref(antes);
      if (id === "tema") aplicarTema(antes.tema);
      setErro(e.status === 401 ? "Entre para guardar suas preferências." : e.message);
    });
  };

  return (
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <MenuDaConta pessoa={pessoa} />

        <main className="conta-painel">
          {erro && <p className="conta-erro" role="alert">{erro}</p>}
          {GRUPOS.map((g) => (
            <section key={g.secao} className="conta-secao">
              <h2>{g.secao}</h2>
              <div className="conta-escolhas">
                {g.escolhas.map((e) => (
                  <Escolha
                    key={e.id}
                    nome={e.id}
                    titulo={e.titulo}
                    explicacao={e.explicacao}
                    opcoes={e.opcoes}
                    valor={pref[e.id]}
                    aoTrocar={(v) => escolher(e.id, v)}
                    aviso={SEM_EFEITO_AINDA.has(e.id) ? "Guardado, mas ainda sem efeito no produto." : null}
                  />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
