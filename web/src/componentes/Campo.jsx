/* Campo de texto.
 *
 * O design system tem `Input`, e ele veio do mesmo lugar que o botão: os tokens
 * `--input-*` ficaram com valores do template — `--input-border-active` em
 * `#484848`, `--input-icon-active` em `#595959`. Nenhum deles é do sistema.
 *
 * AQUI O RÓTULO É `<label>` DE VERDADE, ligado por `htmlFor`. Um `<span>` acima
 * do campo parece igual e não é: perde o clique que foca, e o leitor de tela lê
 * o campo como "editar texto" sem dizer de quê.
 *
 * O ERRO É ANUNCIADO, não só pintado. `aria-invalid` mais `aria-describedby`
 * fazem o leitor dizer o problema junto com o campo. Cor sozinha não chega a
 * quem não distingue cor — e não chega a ninguém que esteja com o foco no campo
 * e o erro embaixo.
 *
 * E A MENSAGEM DE ERRO DIZ O QUE FAZER. "Campo inválido" descreve o estado e não
 * ajuda; "O endereço precisa terminar em @kindle.com" diz onde está o problema.
 */
import { useId } from "react";
import "./campo.css";

export function Campo({ rotulo, ajuda, erro, tipo = "text", rotuloOculto = false, ...resto }) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descrito = [ajuda && idAjuda, erro && idErro].filter(Boolean).join(" ");

  return (
    <div className={`campo${erro ? " com-erro" : ""}`}>
      {/* `rotuloOculto` esconde o rótulo DA VISTA, e não de quem ouve. Serve
          para o campo cujo lugar já o explica — a busca da Ajuda, logo abaixo
          do título da página, com a lupa dentro. Um `placeholder` sozinho não
          resolve: ele some ao digitar, e leitor de tela nenhum é obrigado a
          lê-lo. */}
      <label htmlFor={id} className={rotuloOculto ? "visualmente-oculto" : undefined}>{rotulo}</label>
      {ajuda && <p className="campo-ajuda" id={idAjuda}>{ajuda}</p>}
      <input
        id={id}
        type={tipo}
        aria-invalid={erro ? "true" : undefined}
        aria-describedby={descrito || undefined}
        {...resto}
      />
      {/* `role="alert"` faz o leitor anunciar assim que o erro aparece, sem
          esperar o foco chegar ali. */}
      {erro && <p className="campo-erro" id={idErro} role="alert">{erro}</p>}
    </div>
  );
}
