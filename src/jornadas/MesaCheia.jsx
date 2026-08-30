/* Mesa — cheia. O meio da jornada: o arquivo em preparo.
 *
 * Vem do nó 895:9348. Os desvios estão em DESVIOS.md; o maior deles é que as
 * três cores de estado do desenho FALHAM AA e as três do sistema passam, então
 * a substituição aqui não é coerência, é conserto.
 *
 * A contagem por estado é DERIVADA da lista, nunca mantida à mão. Campo de
 * status que alguém precisa atualizar é a primeira coisa que fica desatualizada,
 * e aí o filtro mente com a culpa do usuário.
 *
 * O número de progresso sai do modelo, não da mão — e é lido em `Dado/Medida`,
 * a monoespaçada, porque num contador o dígito não pode mudar de largura ao
 * trocar, senão o número treme enquanto conta.
 */
import { Cabecalho } from "../componentes/Cabecalho.jsx";
import { Icone } from "../componentes/Icone.jsx";
import "./mesa-cheia.css";

const iconeEnviar = "/icones/icone-enviar.svg";

const ESTADOS = {
  enviando: { rotulo: "Enviando", classe: "enviando" },
  fila: { rotulo: "Na fila", classe: "fila" },
  pronto: { rotulo: "Pronto", classe: "pronto" },
  erro: { rotulo: "Com erro", classe: "erro" },
};

function contar(arquivos) {
  // Derivado, sempre. A contagem não pode divergir da lista porque ela É a lista.
  const c = { enviando: 0, fila: 0, pronto: 0, erro: 0 };
  for (const a of arquivos) c[a.estado] += 1;
  return c;
}

function Arquivo({ nome, estado, feito, total, progresso, detalhe }) {
  const e = ESTADOS[estado];
  return (
    <li className={`arquivo ${e.classe}`}>
      <div className="arquivo-topo">
        <span className="arquivo-nome">{nome}</span>
        <span className="arquivo-estado">{e.rotulo}</span>
      </div>

      {progresso != null && (
        <div
          className="barra"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${nome}: ${progresso}%`}
        >
          <div className="barra-feita" style={{ inlineSize: `${progresso}%` }} />
        </div>
      )}

      <p className="arquivo-detalhe">
        {feito != null && total != null && (
          <span className="dado">
            {feito} MB de {total} MB
          </span>
        )}
        {detalhe && <span className="detalhe-texto">{detalhe}</span>}
        {progresso != null && <span className="dado">{progresso}%</span>}
      </p>
    </li>
  );
}

export function MesaCheia({ arquivos = [], aoVerEstante }) {
  const c = contar(arquivos);
  return (
    <div className="mesa">
      <Cabecalho lugar="mesa" />

      <section className="preparo">
        <div className="preparo-caixa">
          <header className="preparo-topo">
            <h2>Em preparo</h2>
            <p className="resumo">
              {/* Cada número sai do mesmo lugar: a lista. */}
              {Object.entries(c).map(([k, n]) => (
                <span key={k} className="contagem">
                  <span className="dado">{n}</span> {ESTADOS[k].rotulo}
                </span>
              ))}
            </p>
          </header>

          <p className="adicionados">
            <span className="dado">{arquivos.length}</span>{" "}
            {arquivos.length === 1 ? "arquivo adicionado" : "arquivos adicionados"}
          </p>

          <ul className="lista">
            {arquivos.map((a) => (
              <Arquivo key={a.nome} {...a} />
            ))}
          </ul>

          <button type="button" className="primaria" onClick={aoVerEstante}>
            <Icone src={iconeEnviar} />
            <span>Ver na estante</span>
          </button>
        </div>
      </section>
    </div>
  );
}
