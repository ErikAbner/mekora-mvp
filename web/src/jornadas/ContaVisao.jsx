/* Conta — visão geral. A primeira das quatro páginas da trilha.
 *
 * ELA NÃO EXISTIA, e a rota `/conta` renderizava a tela de Dispositivos Kindle.
 * A trilha promete quatro destinos e dois abriam a mesma coisa, com o primeiro
 * mentindo sobre o que é. Um item de menu que leva a outro lugar é pior que um
 * item a menos, porque a pessoa aprende que o menu não é confiável.
 *
 * O QUE ELA MOSTRA VEM TODO DO SERVIDOR. Não há bloco escrito à mão: o e-mail e
 * a data vêm do `/eu`, e as contagens do `/privacidade`, que é a mesma lista
 * que a tela de Privacidade usa. Assim os dois números não podem divergir — e
 * divergiriam, porque um deles seria copiado.
 *
 * Construída sem o desenho: o `figma-local` exige o Dev Mode ligado, e a aba
 * estava em modo design. Está em DESVIOS.md, para o pente fino.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { quemSouEu, lerPrivacidade } from "../../../contrato/api.js";
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { TrilhaConta } from "../componentes/TrilhaConta.jsx";
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

const ONDE_IR = [
  { rota: "/conta/kindle", titulo: "Dispositivos Kindle", oQueE: "Os endereços para onde o Mekora envia. Cada aparelho tem o seu." },
  { rota: "/conta/seguranca", titulo: "Segurança", oQueE: "Os navegadores em que você entrou, e como sair deles à distância." },
  { rota: "/conta/preferencias", titulo: "Preferências", oQueE: "Como o Mekora se comporta ao abrir um arquivo, e o tema." },
  { rota: "/conta/privacidade", titulo: "Privacidade", oQueE: "Tudo o que está guardado, como levar embora e como apagar." },
];

const data = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return null; }
};

export function ContaVisao({ pessoa, aoSair }) {
  const [eu, setEu] = useState(null);
  const [contagens, setContagens] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([quemSouEu().catch(() => null), lerPrivacidade().catch(() => null)])
      .then(([e, p]) => {
        if (!vivo) return;
        setEu(e);
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
    <div className="mesa">
      <Cabecalho />
      <div className="conta">
        <TrilhaConta pessoa={pessoa} aoSair={aoSair} />

        <main className="conta-painel">
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
          {/* A frase é a mesma do backend, e ela é uma promessa que pode ser
              desmentida: se um dia houver nome ou telefone, esta linha precisa
              mudar junto. */}
          <p className="visao-nota">
            Seu e-mail é a única coisa que identifica você. Não há nome, telefone
            nem foto — e não há senha: você entra por link.
          </p>
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

        <section className="visao-ir">
          <h2>Onde ir</h2>
          <ul>
            {ONDE_IR.map((d) => (
              <li key={d.rota}>
                <Link to={d.rota}>
                  <span className="visao-ir-titulo">{d.titulo}</span>
                  <span className="visao-ir-oquee">{d.oQueE}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </main>
      </div>
    </div>
  );
}
