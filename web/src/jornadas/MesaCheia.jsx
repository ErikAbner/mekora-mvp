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
import { Link } from "react-router-dom";
import { Botao } from "../componentes/Botao.jsx";
import "./mesa-cheia.css";

const iconeEnviar = "/icones/icone-enviar.svg";

/* Os quatro estados vêm do contrato, não daqui. Se esta lista divergir da de
 * `contrato/estado.js`, a tela passa a mostrar rótulo para um estado que não
 * existe — ou a esconder um que existe. */
import { useRef, useState } from "react";
import { ESTADOS as DO_CONTRATO } from "../../../contrato/estado.js";

const ESTADOS = {
  fila: { rotulo: "Na fila", classe: "fila" },
  trabalhando: { rotulo: "Em preparo", classe: "enviando" },
  pronto: { rotulo: "Pronto", classe: "pronto" },
  erro: { rotulo: "Com erro", classe: "erro" },
};

/* Falha alto e cedo, e não na tela do usuário. */
for (const e of DO_CONTRATO) {
  if (!ESTADOS[e]) throw new Error(`o contrato conhece o estado "${e}" e esta tela não`);
}

function contar(arquivos) {
  // Derivado, sempre. A contagem não pode divergir da lista porque ela É a lista.
  const c = Object.fromEntries(DO_CONTRATO.map((e) => [e, 0]));
  for (const a of arquivos) if (c[a.estado] !== undefined) c[a.estado] += 1;
  return c;
}

function Arquivo({ nome, estado, feito, total, progresso, detalhe, etapa, motivo, digitalizado, preparo }) {
  const e = ESTADOS[estado];
  /* O motivo vem do backend e É mostrado. O contrato o preserva justamente para
   * isto — uma linha que diz "Com erro" e cala o porquê faz o usuário abrir um
   * chamado que ninguém consegue responder. */
  const explicacao = motivo || detalhe;
  return (
    <li className={`arquivo ${e.classe}`}>
      <div className="arquivo-topo">
        <span className="arquivo-nome">{nome}</span>
        {/* O estado é COR e PALAVRA. A cor já estava certa — as três do sistema
            passam AA —, mas quem não vê a cor precisa da palavra, e ela está
            aqui em texto desde sempre. O que faltava era o anúncio quando ela
            MUDA, e isso vive no resumo acima: anunciar cada linha faria um lote
            de dez arquivos falar dez vezes por transição. */}
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

      {/* O ARQUIVO ANALISADO ESPERA POR UMA DECISÃO, e a tela oferece o lugar
          onde ela é tomada. Sem isto, ele ficaria parado em "na fila" para
          sempre, sem dizer o que falta. */}
      {preparo && (
        <p className="arquivo-preparo">
          <Link to={`/preparo/${preparo}`}>Ver o que encontrei</Link>
        </p>
      )}

      <p className="arquivo-detalhe">
        {feito != null && total != null && (
          <span className="dado">
            {feito} MB de {total} MB
          </span>
        )}
        {/* A etapa diz ONDE parou; o motivo diz o quê. Os dois juntos são o que
            transforma "falhou" em algo que dá para resolver. */}
        {estado === "erro" && etapa && <span className="detalhe-texto">Parou em: {etapa}.</span>}
        {explicacao && (
          /* `role="alert"` só no ERRO. Ele interrompe o que o leitor de tela
             estiver dizendo, e isso é certo para uma falha e errado para um
             detalhe: usar em tudo faria a tela gritar a cada MB carregado, e
             quem ouve isso desliga o leitor — perdendo também os avisos que
             importam. */
          <span className="detalhe-texto" role={estado === "erro" ? "alert" : undefined}>
            {explicacao}
          </span>
        )}
        {digitalizado && <span className="detalhe-texto">Documento digitalizado.</span>}
        {progresso != null && <span className="dado">{progresso}%</span>}
      </p>
    </li>
  );
}

export function MesaCheia({ arquivos = [], aoVerEstante, aoReceberArquivos }) {
  const c = contar(arquivos);
  const campo = useRef(null);
  const [sobre, setSobre] = useState(false);

  /* SOLTAR CONTINUA VALENDO COM A MESA CHEIA.
   *
   * A zona de arrastar só existia na mesa vazia, e com um arquivo dentro a tela
   * trocava para esta — sem input, sem botão, sem zona. Quem subiu um arquivo
   * ficava preso: para adicionar o segundo, tinha que recarregar a página.
   *
   * Achado tentando fazer exatamente isso: soltar um arquivo, depois outro. */
  const soltar = (e) => {
    e.preventDefault();
    setSobre(false);
    if (e.dataTransfer?.files?.length) aoReceberArquivos?.(e.dataTransfer.files);
  };

  return (
    <div
      className={`mesa${sobre ? " recebendo" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={(e) => {
        /* Só apaga o realce quando o ponteiro sai da MESA, e não de um filho:
         * sem esta conferência, passar por cima de qualquer item da lista faz o
         * realce piscar. */
        if (!e.currentTarget.contains(e.relatedTarget)) setSobre(false);
      }}
      onDrop={soltar}
    >
      <Cabecalho lugar="mesa" />

      <section className="preparo">
        <div className="preparo-caixa">
          <header className="preparo-topo">
            {/* O título era "Em preparo", que é também o nome de um ESTADO —
                e a tela se contradizia sozinha: "Em preparo" no topo, "0 Em
                preparo" logo abaixo. O nome do lugar não pode ser o nome de um
                dos estados que ele mostra. */}
            <h2>A mesa</h2>
            {/* O RESUMO É QUEM ANUNCIA. Ele já é a contagem derivada da lista,
                então muda exatamente quando algo muda de estado — e é uma frase
                curta, contra a lista inteira relida a cada transição.

                Sem isto, um arquivo ia de "Em preparo" a "Pronto" ou a "Com
                erro" em silêncio total para quem usa leitor de tela, numa tela
                cujo propósito inteiro é mostrar progresso. */}
            <p className="resumo" role="status" aria-live="polite">
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

          <div className="preparo-acoes">
            <Botao tom="primaria" icone={iconeEnviar} onClick={aoVerEstante}>
              Ver na estante
            </Botao>
            {aoReceberArquivos && (
              <>
                <Botao tom="secundaria" onClick={() => campo.current?.click()}>
                  Adicionar mais
                </Botao>
                {/* O input nativo fica escondido e o botão o aciona: input de
                    arquivo não se estiliza, e recriar um por fora quebraria
                    teclado e leitor de tela. */}
                <input
                  ref={campo}
                  type="file"
                  multiple
                  className="campo-arquivo"
                  onChange={(e) => {
                    if (e.target.files?.length) aoReceberArquivos(e.target.files);
                    /* Limpa o valor: sem isto, escolher O MESMO arquivo duas
                       vezes seguidas não dispara `change` na segunda. */
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
