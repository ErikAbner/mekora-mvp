/* Leitura. O passo pelo qual o produto existe.
 *
 * Vem do nó 895:10472. Duas correções ao desenho estão em DESVIOS.md, e as duas
 * são medidas, não gosto:
 *
 * A PROSA VAI PARA A TINTA CHEIA. O desenho põe o texto do livro em
 * `text/secondary` — a tinta mais fraca do sistema, no conteúdo que é a razão de
 * o produto existir. Com destaque atrás, o rosa dá 3,47 e o azul 3,92: reprovam.
 * Com `text/strong`, os oito pares passam, o pior deles em 11,71.
 *
 * O DESTAQUE É O CONJUNTO CLARO, e eu tinha chamado esse conjunto de `capa/*`.
 * Errei: o claro existe para receber texto por cima. O vivo reprova nos quatro
 * matizes com a tinta da prosa. Marca-texto é nota, e nota é um dos três
 * endereços onde a cor é permitida.
 */
import { useState } from "react";
import { Icone } from "../componentes/Icone.jsx";
import "./leitura.css";

const iconeMenu = "/icones/icone-menu.svg";
const iconeCaderno = "/icones/icone-caderno.svg";
const iconeMarcador = "/icones/icone-marcador.svg";
const iconeBuscar = "/icones/icone-buscar.svg";
const iconeConta = "/icones/icone-conta.svg";
const ornamentoAbertura = "/icones/ornamento-abertura.svg";

/* As quatro cores de destaque. O nome diz o papel, e o valor é o conjunto claro
 * — o único em que a prosa continua legível por cima. */
export const DESTAQUES = {
  verde: "var(--nota-verde, #efffbf)",
  amarelo: "var(--nota-amarelo, #fff8bf)",
  rosa: "var(--nota-rosa, #ffbfc0)",
  azul: "var(--nota-azul, #bfdfff)",
};

/* O bloco do EPUB e o parágrafo do exemplo passam pelo MESMO componente: os dois
 * carregam texto e marcas por deslocamento de caractere. Foi para isso que a
 * ênfase do livro virou deslocamento em vez de HTML aninhado — o destaque do
 * usuário e a ênfase do autor vivem no mesmo sistema de coordenadas, e a tela
 * não precisa saber de onde cada um veio. */
const TAG = { titulo: "h2", subtitulo: "h3", citacao: "blockquote", item: "li", legenda: "figcaption" };

function Bloco({ tipo = "paragrafo", texto, destaques = [], marcas = [] }) {
  const Como = TAG[tipo] ?? "p";
  const todas = [
    ...marcas.map((m) => ({ ...m, classe: m.tipo })),
    ...destaques.map((d) => ({ ...d, classe: "destaque", cor: d.cor })),
  ].sort((a, b) => a.de - b.de);

  if (!todas.length) return <Como className={`bloco ${tipo}`}>{texto}</Como>;

  const partes = [];
  let i = 0;
  for (const m of todas) {
    if (m.de < i) continue;   // sobreposição: a primeira ganha, e a segunda some
    if (m.de > i) partes.push(texto.slice(i, m.de));
    partes.push(
      m.classe === "destaque" ? (
        <mark key={`${m.de}-d`} style={{ background: DESTAQUES[m.cor] }}>{texto.slice(m.de, m.ate)}</mark>
      ) : (
        <em key={`${m.de}-${m.classe}`} className={m.classe}>{texto.slice(m.de, m.ate)}</em>
      ),
    );
    i = m.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <Como className={`bloco ${tipo}`}>{partes}</Como>;
}

function Paragrafo({ texto, destaques = [] }) {
  if (!destaques.length) return <p>{texto}</p>;

  /* O destaque é desenhado com `<mark>` e não com um bloco absoluto atrás.
   *
   * O desenho usa retângulos posicionados por coordenada — oito deles, com
   * `top` e `left` em pixel. Isso quebra na primeira mudança de corpo, de
   * largura ou de idioma, e some para leitor de tela: o trecho destacado deixa
   * de ser destacado, vira um retângulo colorido ao lado de um texto qualquer.
   *
   * `<mark>` acompanha o texto porque É o texto, e é anunciado como marcação.
   */
  const partes = [];
  let i = 0;
  for (const d of [...destaques].sort((a, b) => a.de - b.de)) {
    if (d.de > i) partes.push(texto.slice(i, d.de));
    partes.push(
      <mark key={d.de} style={{ background: DESTAQUES[d.cor] }}>
        {texto.slice(d.de, d.ate)}
      </mark>,
    );
    i = d.ate;
  }
  if (i < texto.length) partes.push(texto.slice(i));
  return <p>{partes}</p>;
}

export function Leitura({ livro, aviso }) {
  const [cromoVisivel, setCromo] = useState(true);

  if (!livro) return null;

  return (
    <div className="leitura">
      {/* O cromo recolhe. Numa tela de leitura, a interface que fica é a que
          disputa atenção com o texto — e aqui o texto é o produto. */}
      <div className={`cromo${cromoVisivel ? "" : " recolhido"}`}>
        <nav className="cromo-caixa" aria-label="Leitura">
          <button type="button" aria-label="Menu" onClick={() => setCromo((v) => !v)}>
            <Icone src={iconeMenu} />
          </button>
          <button type="button" aria-label="Notas"><Icone src={iconeCaderno} /></button>
          <button type="button" aria-label="Marcadores"><Icone src={iconeMarcador} /></button>
        </nav>
        <nav className="cromo-caixa" aria-label="Ferramentas">
          <button type="button" aria-label="Buscar no livro"><Icone src={iconeBuscar} /></button>
          <button type="button" aria-label="Conta"><Icone src={iconeConta} /></button>
        </nav>
      </div>

      <header className="abertura">
        <h1>{livro.titulo}</h1>
        <p className="autoria">Escrito por {livro.autor}</p>
        <img src={ornamentoAbertura} alt="" className="ornamento" aria-hidden="true" />
      </header>

      {/* A medida vem do sistema: 680px é a coluna do desenho, e a 20px dá
          cerca de 65 caracteres por linha — dentro da faixa confortável. */}
      {/* O produto diz o que não sabe. Um texto de exemplo sem aviso passaria por
          conteúdo do usuário, que é a pior confusão possível numa tela de leitura. */}
      {aviso && <p className="leitura-aviso" role="status">{aviso}</p>}

      <article className="prosa">
        {(livro.blocos ?? livro.paragrafos ?? []).map((b, i) => (
          <Bloco key={i} {...b} />
        ))}
      </article>
    </div>
  );
}
