/* Conta — visão geral. A primeira das quatro páginas da trilha.
 *
 * ELA NÃO EXISTIA, e a rota `/conta` renderizava a tela de Dispositivos Kindle.
 * A trilha promete quatro destinos e dois abriam a mesma coisa, com o primeiro
 * mentindo sobre o que é. Um item de menu que leva a outro lugar é pior que um
 * item a menos, porque a pessoa aprende que o menu não é confiável.
 *
 * ELA NAO REPETE A TRILHA. A primeira versao tinha uma seção "Onde ir" com os
 * quatro destinos da conta, cada um com uma frase — e eles já estão na trilha,
 * a trinta pixels de distância. Um índice que lista os mesmos links do menu ao
 * lado não é uma página, é um menu; e dois menus para os mesmos quatro lugares
 * é onde a pessoa começa a duvidar de qual está certo.
 *
 * O que sobra é o que só esta tela responde: quem é você, desde quando, e o que
 * a conta guarda em número.
 *
 * O QUE ELA MOSTRA VEM TODO DO SERVIDOR. Não há bloco escrito à mão: o e-mail e
 * a data vêm do `/eu`, e as contagens do `/privacidade`, que é a mesma lista
 * que a tela de Privacidade usa. Assim os dois números não podem divergir — e
 * divergiriam, porque um deles seria copiado.
 *
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design. Está em DESVIOS.md, para o pente fino.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  enderecoDoRetrato, lerPrivacidade, mudarPerfil, porRetrato, quemSouEu, tirarRetrato,
} from "../../../contrato/api.js";
import { Botao } from "../componentes/Botao.jsx";
import { Campo } from "../componentes/Campo.jsx";
import "./conta-visao.css";

/* O que vale mostrar em cima, e o rótulo de cada um. As chaves são as do
 * `/privacidade`; o que não vier, não aparece — em vez de aparecer zerado, que
 * é o mesmo que afirmar que está vazio. */
const RESUMO = [
  { chave: "livros", rotulo: "livros", um: "livro", onde: "/estante" },
  { chave: "notas", rotulo: "notas", um: "nota", onde: "/notas" },
  { chave: "estudos", rotulo: "estudos", um: "estudo", onde: "/estudos" },
  { chave: "aparelhos", rotulo: "aparelhos Kindle", um: "aparelho Kindle", onde: "/conta/kindle" },
];


const data = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return null; }
};

export function ContaVisao({ pessoa, aoSair, aoMudarPerfil }) {
  const [eu, setEu] = useState(null);
  const [contagens, setContagens] = useState(null);
  const [erro, setErro] = useState(null);
  /* O NOME E O RETRATO, decididos em 02/09/2026. Até então a conta era só o
     e-mail — e a trilha ao lado inventava um nome a partir dele. */
  const [nome, setNome] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recado, setRecado] = useState(null);
  /* Sobe a cada troca de retrato. O endereço da imagem é sempre o mesmo, então
     sem isto o navegador continua desenhando o rosto anterior. */
  const [versao, setVersao] = useState(0);
  const campoDoRetrato = useRef(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([quemSouEu().catch(() => null), lerPrivacidade().catch(() => null)])
      .then(([e, p]) => {
        if (!vivo) return;
        setEu(e);
        setNome(e?.nome ?? "");
        /* O `/privacidade` responde `itens: [{nome, quantos, explicacao}]`.
           Vira mapa aqui, e não no render, para a tela não repetir a busca por
           chave a cada linha. */
        const mapa = {};
        for (const it of p?.itens ?? []) mapa[it.nome] = it.quantos;
        setContagens(mapa);
        if (!e) setErro("Não foi possível ler os dados da sua conta agora.");
      });
    return () => { vivo = false; };
  }, []);

  const desde = data(eu?.desde);
  /* Só entra no resumo o que o servidor SOUBE responder. Uma contagem ausente
     virando "0" afirmaria que está vazio, e ausência não é vazio. */
  const linhas = contagens
    ? RESUMO.filter((r) => typeof contagens[r.chave] === "number")
    : [];

  return (
    /* O cabecalho fica FORA do `.conta`, que e a linha de trilha mais painel.
       Dentro dele o cabecalho vira uma terceira coluna e empurra o painel para
       fora da tela — foi o que aconteceu na primeira medida. */
    /* `chao` no lugar do fundo liso: a Conta se abre POR CIMA do chão
       pontilhado, e é o que o `895:10599` mostra. */
    <main className="conta-painel">
        {/* A ILUSTRAÇÃO DO DESENHO, que faltava. O nó traz uma acima do painel
            em cada tela de conta, e ela é ornamento — `aria-hidden`, porque um
            leitor de tela anunciando "imagem" antes do conteúdo da conta só
            atrasa quem veio resolver alguma coisa. */}
        {/* ESTA TELA TROCA DE ARTE POR LARGURA, e é a única que troca.
            No computador o nó `934:10740` traz "secure profile settings" —
            alguém segurando uma lista com um visto — em 272×224. No telefone o
            `966:25339` traz OUTRO desenho: um mago com varinha e estrelas,
            "magic password", em 138,22×164.

            O comentário do `conta.css` afirmava que o telefone punha "a MESMA
            ilustração em 138,22×164". Estava errado, e ninguém tinha aberto as
            duas capturas lado a lado. São desenhos diferentes.

            A troca é `<picture>` e não CSS: o navegador escolhe a fonte ANTES de
            baixar, então a arte que não vale para esta largura nunca desce. Com
            duas `<img>` e `display: none`, as duas baixam.

            E ISTO NÃO VIRA CONVENÇÃO. Decisão do Erik em 07/09: "não criar uma
            convenção obrigatória de duas artes para toda tela. Respeitar o Figma
            caso a caso". As outras três telas de conta têm uma arte só, nas duas
            larguras, e continuam com uma. */}
        <picture>
          <source srcSet="/icones/ilustracao-conta-telefone.svg" media="(max-width: 767px)" />
          <img className="conta-desenho" src="/icones/ilustracao-conta.svg" alt="" aria-hidden="true" />
        </picture>
        {erro && <p className="conta-erro" role="alert">{erro}</p>}

        <section className="visao-quem">
          <h2>Sua conta</h2>
          <dl className="visao-dados">
            <div>
              <dt>E-mail</dt>
              <dd>{eu?.email ?? pessoa?.email ?? "—"}</dd>
            </div>
            {desde && (
              <div>
                <dt>Aqui desde</dt>
                <dd>{desde}</dd>
              </div>
            )}
          </dl>
          {/* A FRASE MUDOU quando o nome e o retrato passaram a existir. Ela
              dizia "seu e-mail é a única coisa que identifica você; não há nome,
              telefone nem foto", e a partir do momento em que os dois campos
              existem essa frase vira a mentira que ela existia para evitar.

              O que continua verdade, e é o que importa: os dois são opcionais, e
              entrar nunca pede nenhum deles. */}
          <p className="visao-nota">
            O nome e o retrato são seus e são opcionais — entrar nunca pede
            nenhum dos dois. Telefone não existe, e senha também não: você entra
            por link.
          </p>
        </section>

        {/* COMO VOCÊ QUER SER CHAMADO. O campo e o retrato juntos, porque são a
            mesma decisão vista de dois jeitos. */}
        <section className="visao-perfil">
          <h2>Como você quer ser chamado</h2>

          <div className="visao-retrato">
            <div className="visao-retrato-atual" aria-hidden="true">
              {eu?.tem_retrato
                ? <img src={enderecoDoRetrato(versao)} alt="" />
                : <span>{(nome || eu?.email || "?").trim().charAt(0).toUpperCase()}</span>}
            </div>
            <div className="visao-retrato-acoes">
              <Botao tom="secundaria" onClick={() => campoDoRetrato.current?.click()}>
                {eu?.tem_retrato ? "Trocar o retrato" : "Pôr um retrato"}
              </Botao>
              {eu?.tem_retrato && (
                <Botao
                  tom="secundaria"
                  onClick={async () => {
                    setRecado(null);
                    try {
                      await tirarRetrato();
                      setEu((x) => ({ ...x, tem_retrato: false }));
                      setVersao((v) => v + 1);
                      aoMudarPerfil?.();
                    } catch (e) {
                      setRecado(e.message);
                    }
                  }}
                >
                  Tirar
                </Botao>
              )}
              {/* O input nativo fica escondido e o botão o aciona: input de
                  arquivo não se estiliza, e recriar um por fora quebraria
                  teclado e leitor de tela. */}
              <input
                ref={campoDoRetrato}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="campo-arquivo"
                onChange={async (e) => {
                  const arquivo = e.target.files?.[0];
                  /* Limpa o valor: sem isto, escolher O MESMO arquivo duas
                     vezes seguidas não dispara `change` na segunda. */
                  e.target.value = "";
                  if (!arquivo) return;
                  setRecado(null);
                  try {
                    await porRetrato(arquivo);
                    setEu((x) => ({ ...x, tem_retrato: true }));
                    setVersao((v) => v + 1);
                    aoMudarPerfil?.();
                  } catch (err) {
                    setRecado(err.message);
                  }
                }}
              />
              <p className="visao-nota">
                O servidor guarda um recorte quadrado feito por ele, e não a
                imagem que você mandou — junto com a original iriam a câmera, a
                data e, em foto de celular, a coordenada de onde ela foi tirada.
              </p>
            </div>
          </div>

          <div className="visao-nome">
            <Campo
              rotulo="Nome"
              value={nome}
              maxLength={80}
              placeholder="Como aparece na sua conta"
              ajuda="Deixe em branco para não ter nenhum."
              onChange={(e) => setNome(e.target.value)}
            />
            <Botao
              tom="primaria"
              porque={guardando ? "Guardando…" : nome.trim() === (eu?.nome ?? "") ? "O nome está como já estava" : null}
              onClick={async () => {
                setGuardando(true);
                setRecado(null);
                try {
                  const r = await mudarPerfil({ nome });
                  setEu((x) => ({ ...x, nome: r.nome }));
                  setNome(r.nome ?? "");
                  setRecado("Guardado.");
                  aoMudarPerfil?.();
                } catch (e) {
                  setRecado(e.message);
                } finally {
                  setGuardando(false);
                }
              }}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </Botao>
          </div>

          {recado && <p className="visao-recado" role="status">{recado}</p>}
        </section>

        {linhas.length > 0 && (
          <section className="visao-resumo">
            <h2>O que existe na conta</h2>
            <ul>
              {linhas.map((r) => {
                const n = contagens[r.chave];
                return (
                  <li key={r.chave}>
                    <Link to={r.onde}>
                      <span className="visao-numero">{n}</span>
                      <span className="visao-rotulo">{n === 1 ? r.um : r.rotulo}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        </main>
  );
}
