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
import { Rodape } from "../componentes/Rodape.jsx";
import { Soltar } from "../componentes/Soltar.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { Link } from "react-router-dom";
import { Botao } from "../componentes/Botao.jsx";
import "./mesa-cheia.css";
/* A PROMESSA E A ÁREA DE SOLTAR SÃO AS MESMAS DAS DUAS TELAS, e o CSS delas mora
 * no arquivo da mesa vazia. Importar aqui é o que torna a dependência explícita:
 * o pacote junta tudo num arquivo só, então funcionaria em silêncio — até o dia
 * em que a mesa vazia deixasse de existir e esta tela perdesse o estilo sem que
 * ninguém tivesse tocado nela. Copiar as regras não é opção: `scripts/classes.mjs`
 * recusa uma classe definida em dois arquivos, e com razão. */
import "./mesa-vazia.css";

const iconeEnviar = "/icones/icone-enviar.svg";

/* Os quatro estados vêm do contrato, não daqui. Se esta lista divergir da de
 * `contrato/estado.js`, a tela passa a mostrar rótulo para um estado que não
 * existe — ou a esconder um que existe. */
import { useState } from "react";
import { ESTADOS as DO_CONTRATO } from "../../../contrato/estado.js";

/* OS RÓTULOS SÃO OS DO DESENHO — nó 895:9736: Enviando, Na fila, Pronto, Com
 * erro. O de `trabalhando` dizia "Em preparo", que é também o nome da SEÇÃO, e
 * a tela se contradizia: "Em preparo" no topo e "0 Em preparo" logo abaixo.
 *
 * Eu tinha resolvido trocando o nome da seção para "A mesa" — o que consertou a
 * contradição e afastou a tela do desenho. O desenho não tem esse problema:
 * lá a seção é "Em preparo" e o estado é "Enviando". */
/* A ORDEM É A DO NÓ 895:9348 — Enviando, Na fila, Pronto, Com erro —, e não a
 * ordem em que o contrato lista os estados. Ela segue o caminho do arquivo pela
 * tela: primeiro o que está acontecendo agora, depois o que espera, depois os
 * dois fins. `Object.keys` de um literal preserva a ordem de escrita, então é
 * aqui que ela se decide. */
const ESTADOS = {
  trabalhando: { rotulo: "Enviando", classe: "enviando" },
  fila: { rotulo: "Na fila", classe: "fila" },
  pronto: { rotulo: "Pronto", classe: "pronto" },
  erro: { rotulo: "Com erro", classe: "erro" },
};

/* Falha alto e cedo, e não na tela do usuário. */
for (const e of DO_CONTRATO) {
  if (!ESTADOS[e]) throw new Error(`o contrato conhece o estado "${e}" e esta tela não`);
}

function contar(arquivos) {
  // Derivado, sempre. A contagem não pode divergir da lista porque ela É a lista.
  //
  // A ORDEM VEM DE `ESTADOS`, e não de `DO_CONTRATO`: o contrato lista os
  // estados que existem, e não a ordem em que a tela os mostra. Os dois papéis
  // moravam na mesma lista, e por isso os recortes apareciam fora da ordem do
  // desenho. O laço acima continua garantindo que nenhum estado do contrato
  // fique de fora daqui.
  const c = Object.fromEntries(Object.keys(ESTADOS).map((e) => [e, 0]));
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

export function MesaCheia({ arquivos = [], aoVerEstante, aoReceberArquivos, backend }) {
  const [recorte, setRecorte] = useState("tudo");
  const c = contar(arquivos);
  /* A lista filtrada pelo recorte. `tudo` é o padrão, e é o que o desenho marca. */
  const visiveis = recorte === "tudo" ? arquivos : arquivos.filter((a) => a.estado === recorte);
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

      {/* A PROMESSA E A ÁREA DE SOLTAR, NO TOPO — nó 895:9348.
       *
       * A mesa cheia começava direto na fila, e a única forma de acrescentar um
       * arquivo era o botão "Adicionar mais", no fim de uma lista que pode ter
       * trinta itens. No desenho a área de soltar é a PRIMEIRA coisa da tela,
       * antes da fila, igual à mesa vazia — a mesma área, com a mesma lista de
       * formatos e a mesma frase sobre não precisar de conta.
       *
       * É o mesmo componente das outras duas telas. Uma segunda cópia aqui seria
       * a lista de formatos divergindo em um dos três lugares. */}
      <section className="promessa">
        <h1>
          Uma estante para aquilo
          <br />
          que ainda está em movimento.
        </h1>
      </section>

      {aoReceberArquivos && (
        <section className="entrada">
          <Soltar aoReceberArquivos={aoReceberArquivos} backend={backend} />
        </section>
      )}

      <section className="preparo">
        <div className="preparo-caixa">
          <header className="preparo-topo">
            <h2>Em preparo</h2>
            {/* O RESUMO É QUEM ANUNCIA. Ele já é a contagem derivada da lista,
                então muda exatamente quando algo muda de estado — e é uma frase
                curta, contra a lista inteira relida a cada transição.

                Sem isto, um arquivo ia de "Enviando" a "Pronto" ou a "Com erro"
                em silêncio total para quem usa leitor de tela, numa tela cujo
                propósito inteiro é mostrar progresso.

                Ele fica invisível: quem enxerga tem os recortes logo abaixo,
                com os mesmos números. Dois textos idênticos lado a lado seriam
                lidos duas vezes por quem usa leitor de tela. */}
            <p className="resumo visualmente-oculto" role="status" aria-live="polite">
              {Object.entries(c).map(([k, n]) => (
                <span key={k} className="contagem">
                  <span className="dado">{n}</span> {ESTADOS[k].rotulo}
                </span>
              ))}
            </p>
          </header>

          {/* OS RECORTES DA MESA — nó 895:9736. As contagens eram uma frase, e
              o desenho as põe como recortes clicáveis, com "N arquivos
              adicionados" marcado por padrão. É a mesma forma da estante e dos
              estudos, e ela vale aqui pelo mesmo motivo: numa fila de trinta,
              "só os que deram erro" é a pergunta que se faz.

              Recorte vazio não é clicável: levar alguém a uma lista em branco é
              pior que dizer antes que não há nada nela. */}
          <nav className="recortes" aria-label="Recortes da mesa">
            {[["tudo", `${arquivos.length} ${arquivos.length === 1 ? "arquivo adicionado" : "arquivos adicionados"}`, arquivos.length],
              ...Object.entries(c).map(([k, n]) => [k, ESTADOS[k].rotulo, n])
            ].map(([id, rotulo, quantos]) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === recorte ? "true" : "false"}
                disabled={quantos === 0 && id !== recorte}
                onClick={() => setRecorte(id)}
              >
                {/* O NÚMERO ANTES DO RÓTULO — "1 Enviando", "0 Na fila", como o
                    nó 895:9348 escreve. Estava ao contrário. A ordem importa
                    numa fileira de quatro: o olho corre a coluna dos números,
                    e com eles no fim ele precisa ler o rótulo de cada um para
                    achar onde o número está. */}
                {id === "tudo" ? rotulo : <><span className="dado">{quantos}</span> {rotulo}</>}
              </button>
            ))}
          </nav>

          <ul className="lista">
            {visiveis.map((a) => (
              <Arquivo key={a.nome} {...a} />
            ))}
          </ul>

          {!visiveis.length && (
            <p className="arquivo-detalhe">
              Nenhum arquivo neste recorte. Os outros continuam na fila.
            </p>
          )}

          <div className="preparo-acoes">
            <Botao tom="primaria" icone={iconeEnviar} onClick={aoVerEstante}>
              Ver na estante
            </Botao>
            {/* "Adicionar mais" saiu: a área de soltar do topo faz a mesma
                coisa, com a lista de formatos junto, e é ela que o desenho põe
                na tela. Dois caminhos para a mesma ação em pontas opostas de uma
                página que pode ter trinta itens é a pessoa procurando qual dos
                dois vale. */}
          </div>
        </div>
      </section>
    
      <Rodape />
    </div>
  );
}
