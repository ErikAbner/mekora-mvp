/* Aviso · preferência fora do padrão — nó 941:23109.
 *
 * A caixa aparece ANTES de preparar e diz uma coisa só: o que vai acontecer com
 * este arquivo não é o comportamento padrão do Mekora, porque você mudou N
 * escolhas. O desenho conta ("1 preferência fora do padrão") e NOMEIA
 * ("Personalizado", que é o rótulo da opção escolhida) — contar sem nomear
 * obrigaria a abrir a conta só para descobrir qual.
 *
 * O BOTÃO VEM DE FORA. No desenho ele é "Preparar arquivos" e está dentro da
 * caixa; aqui a caixa recebe a ação de quem a usa, porque a tela de preparo já
 * tem a sua — e duas primárias com o mesmo destino, uma dentro e outra fora da
 * moldura, é a pessoa tendo de escolher entre dois botões idênticos.
 *
 * QUANDO NÃO HÁ DESVIO, NÃO HÁ CAIXA. "0 preferências fora do padrão" é ruído:
 * o padrão é o que se espera, e o que se espera não precisa ser anunciado.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lerPreferencias } from "../../../contrato/api.js";
import { foraDoPadrao } from "../preferencias.js";
import "./aviso-preferencias.css";

export function AvisoPreferencias({ children }) {
  const [desvios, setDesvios] = useState([]);

  useEffect(() => {
    let vivo = true;
    lerPreferencias()
      .then((r) => vivo && setDesvios(foraDoPadrao(r?.escolhas)))
      /* Sem conta a rota devolve `{}` e não erro — e sem conta não há
         preferência guardada, então não há desvio a anunciar. */
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!desvios.length) return children ?? null;

  return (
    <div className="aviso-pref">
      <div className="aviso-pref-texto">
        <p className="titulo-24 aviso-pref-conta">
          {desvios.length}{" "}
          {desvios.length === 1 ? "preferência fora do padrão" : "preferências fora do padrão"}
        </p>
        {/* O link leva para onde se muda. O rótulo é o da escolha, não a
            palavra "preferências": é ele que diz o que está diferente. */}
        <Link className="aviso-pref-quais" to="/conta">
          {desvios.map((d) => d.rotulo).join(", ")}
        </Link>
      </div>
      {children}
    </div>
  );
}
