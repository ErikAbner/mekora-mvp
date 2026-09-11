/* As rotas do Mekora.
 *
 * Antes disto o passo era estado local e o cabeçalho era decoração: os quatro
 * botões não levavam a lugar nenhum. Agora cada lugar tem endereço, o voltar do
 * navegador funciona, e um link pode ser guardado.
 *
 * `react-router` e não um roteador meu, e a razão é o dia 05/09: roteador
 * caseiro tem quarenta linhas e nenhuma documentação fora deste repositório.
 * Depois que o agente sair, ferramenta conhecida vale mais que ferramenta
 * enxuta — resposta para `react-router` existe em qualquer lugar.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { MesaVazia } from "./jornadas/MesaVazia.jsx";
import { Apresentacao } from "./jornadas/Apresentacao.jsx";
import { ContaVisao } from "./jornadas/ContaVisao.jsx";
import { ContaSeguranca } from "./jornadas/ContaSeguranca.jsx";
import { Ajuda } from "./jornadas/Ajuda.jsx";
import { Atualizacoes } from "./jornadas/Atualizacoes.jsx";
import { Sistema } from "./jornadas/Sistema.jsx";
import { Politicas } from "./jornadas/Politicas.jsx";
import { EstudoPagina } from "./jornadas/EstudoPagina.jsx";
import { MesaCheia } from "./jornadas/MesaCheia.jsx";
import { Estante } from "./jornadas/Estante.jsx";
import { Leitura } from "./jornadas/Leitura.jsx";
import { AindaNao } from "./jornadas/AindaNao.jsx";
import { SoNoComputador } from "./componentes/SoNoComputador.jsx";
import { Conta } from "./jornadas/Conta.jsx";
import { Entrar } from "./jornadas/Entrar.jsx";
import { CriarConta } from "./jornadas/CriarConta.jsx";
import { Privacidade } from "./jornadas/Privacidade.jsx";
import { Canvas } from "./jornadas/Canvas.jsx";
import { usarCanvas } from "./estado/usarCanvas.js";
import { Estudos } from "./jornadas/Estudos.jsx";
import { Notas } from "./jornadas/Notas.jsx";
import { Livro } from "./jornadas/Livro.jsx";
import { Nota } from "./jornadas/Nota.jsx";
import { Preparo } from "./jornadas/Preparo.jsx";
import { usarEstudos } from "./estado/usarEstudos.js";
import { Cabecalho } from "./componentes/Cabecalho.jsx";
import { MenuDaConta } from "./componentes/MenuDaConta.jsx";
import { GavetaDeSecao } from "./componentes/GavetaDeSecao.jsx";
import { GavetaDeLeitura } from "./componentes/GavetaDeLeitura.jsx";
import { Recado } from "./componentes/Recado.jsx";
import { RECADO_PEDIDO } from "./recado.js";
import { Consentimento } from "./componentes/Consentimento.jsx";
import { ligarMedicao, medirTela } from "./medir.js";
import { ContaKindle } from "./jornadas/ContaKindle.jsx";
import { LUGARES } from "./lugares.js";
import { useJornada } from "./estado/useJornada.js";
import { usePessoa } from "./estado/usePessoa.js";
import { abrirLivro, blocosDoCapitulo } from "./leitor/abrir.js";
import { gravarProgresso, lerProgresso } from "../../contrato/api.js";
import { fracaoLida } from "../../contrato/progresso.js";
import { usarNotas } from "./leitor/usarNotas.js";
import { usarMarcadores } from "./leitor/usarMarcadores.js";
import { analisar, apagarNota, chaveDe, importarClippings, lerTodasAsNotas } from "../../contrato/api.js";
import { EXEMPLO_FILA, EXEMPLO_ESTANTE, EXEMPLO_LEITURA } from "./exemplos.js";

/* O exemplo entra SÓ quando a URL pede — `?exemplo`. Nunca no caminho normal,
 * porque tela que inventa dado esconde backend fora do ar. */
/* Enquanto não há autenticação — a AUTH-001 está `proposed`, não aceita — a
 * pessoa é de exemplo. Fica nomeado para ninguém confundir com login. */
/* A pessoa VEM DO SERVIDOR agora. O que sobrou do exemplo é o nome, porque a
 * conta guarda um e-mail e nada mais — a DEC-0039 §1 não pede nome, e pedir um
 * dado que o produto não usa é coletar por hábito. */
/* O NOME AGORA É O QUE A PESSOA ESCREVEU, e não um pedaço do e-mail.
 *
 * Isto fazia `email.split("@")[0]`: `erik@mekora.local` virava "erik" na trilha
 * da conta — enquanto a tela de privacidade afirmava, a duas telas de
 * distância, que "não há nome, telefone nem foto". Uma das duas mentia, e era
 * esta.
 *
 * Sem nome escolhido, a trilha cai no rótulo genérico dela ("Sua conta") e
 * mostra o e-mail embaixo, que é o que o produto de fato sabe. */
function comoChamar(pessoa) {
  return pessoa
    ? { nome: pessoa.nome ?? null, email: pessoa.email, retrato: pessoa.retrato ?? null }
    : null;
}

/* Aparelhos de exemplo, com os nomes do desenho. Enquanto o backend não os
 * serve, eles ficam aqui e não dentro da tela. */

function usaExemplo() {
  return new URLSearchParams(location.search).has("exemplo");
}

function Mesa() {
  const { arquivos, livros, backend, receber, refazerErros, carregarEstante, destravar } = useJornada();
  const navegar = useNavigate();
  const lista = arquivos.length ? arquivos : usaExemplo() ? EXEMPLO_FILA : [];
  const receberNaMesa = useCallback((arquivos) => {
    const itens = Array.from(arquivos);
    return receber(itens, itens.length === 1 ? {
      aoCriar: (id, modo) => {
        navegar(`/preparo/${id}?modo=${modo}`);
        return true;
      },
    } : {});
  }, [navegar, receber]);

  /* A MESA TAMBÉM PRECISA DA ESTANTE. O nó 895:9981 termina em três blocos
     feitos de livros — "Continue", "Ficaram prontos" e "Na estante" —, e nenhum
     deles sai da fila: a fila é o que ainda não virou livro. */
  useEffect(() => { carregarEstante().catch(() => {}); }, [carregarEstante]);

  if (!lista.length) return <MesaVazia aoReceberArquivos={receberNaMesa} backend={backend} />;
  return (
    <MesaCheia
      arquivos={lista}
      livros={livros}
      aoVerEstante={() => navegar("/estante")}
      aoReceberArquivos={receberNaMesa}
      aoRefazerErros={refazerErros}
      aoDestravar={destravar}
      backend={backend}
    />
  );
}

function PaginaApresentacao() {
  const { backend, receber } = useJornada();
  const navegar = useNavigate();
  /* Soltar um arquivo aqui faz o mesmo que na Mesa, e leva para la: a fila do
     preparo mora na Mesa, e mostra-la embaixo da landing seria uma segunda
     mesa, que depois divergiria da primeira. */
  return (
    <Apresentacao
      backend={backend}
      aoReceberArquivos={(arquivos) => {
        const itens = Array.from(arquivos);
        receber(itens, itens.length === 1 ? {
          aoCriar: (id, modo) => {
            navegar(`/preparo/${id}?modo=${modo}`);
            return true;
          },
        } : {});
        if (itens.length > 1) navegar("/mesa");
      }}
    />
  );
}

function PaginaEstante() {
  const { livros, carregarEstante } = useJornada();
  const [aberto, setAberto] = useState(null);
  const navegar = useNavigate();
  useEffect(() => { carregarEstante(); }, [carregarEstante]);
  const lista = livros.length ? livros : usaExemplo() ? EXEMPLO_ESTANTE : [];

  /* A ficha mostra o livro ESCOLHIDO, e não um exemplo fixo. Antes ela exibia
   * sempre o mesmo registro escrito à mão, o que fazia a estante parecer
   * funcionar enquanto clicar em qualquer livro mostrava outro. */
  const selecionado = lista.find((l) => l.chave === aberto) ?? lista[0] ?? null;

  return (
    <Estante
      livros={lista}
      /* O LIVRO INTEIRO, e nada por cima dele.
       *
       * Era `{ ...EXEMPLO_FICHA, ...selecionado }`: o livro real sobrescrevia
       * título e autor, e o resto do exemplo SOBREVIVIA — porcentagem lida,
       * contagem de notas, uma citação e a etiqueta "#Design" —, porque não
       * havia campo real para substituí-lo. Todo livro da estante mostrava 80%
       * lido e a mesma frase entre aspas.
       *
       * Agora o servidor manda esses campos, e o que ele não sabe vem nulo: a
       * tela cala em vez de completar. */
      selecionado={selecionado}
      aoEscolher={(l) => setAberto(l.chave)}
      aoAbrir={(l) => {
        /* Sem arquivo convertido não há o que abrir. Navegar mesmo assim
         * levaria a um leitor em branco, e o leitor em branco não distingue
         * "ainda convertendo" de "quebrou". */
        if (!l?.leituraUrl) return;
        navegar(`/leitura/${l.chave}`, { state: { url: l.leituraUrl, titulo: l.titulo } });
      }}
    />
  );
}

function PaginaLeitura() {
  const { id } = useParams();
  const local = useLocation();
  const [livro, setLivro] = useState(null);
  const [erro, setErro] = useState(null);

  const [progresso, setProgresso] = useState(null);
  const { notas, erro: erroDeNota, marcar, comentar, trocarCor, remover } = usarNotas(id);
  /* As dobras deste livro. Separadas das notas de propósito: uma nota é o que
   * se marcou e escreveu, e um marcador é o lugar para onde voltar. */
  const { marcadores, erro: erroDeMarcador, dobrar, desdobrar } = usarMarcadores(id);

  useEffect(() => {
    let vivo = true;
    /* O EPUB é lido NO NAVEGADOR, não servido como texto pelo backend. É o mesmo
     * arquivo que vai para o Kindle, então o que se lê na tela e o que se lê no
     * aparelho não podem divergir. */
    /* O ENDERECO, e nao o numero. `/storage/output/7/...` respondia para quem
     * contasse ate sete, e a DEC-0039 §5 trocou isso pela chave do trabalho.
     * O numero da rota continua sendo o da estante; a chave e buscada aqui. */
    /* O ENDEREÇO DO ARQUIVO PRECISA SOBREVIVER A UM F5.
     *
     * A estante passa a URL pelo estado do roteador, o que é rápido e some ao
     * recarregar — e recarregar no meio de uma leitura é comum. Sem estado, o
     * caminho antigo montava `/storage/output/{id}/livro.epub`, com
     * `livro.epub` sendo um chute; o arquivo real se chama `{slug}.epub`.
     * Resultado: apertar F5 lendo um livro devolvia o TEXTO DE EXEMPLO.
     *
     * Então o estado do roteador vira atalho, e não fonte: quando ele não
     * existe, o endereço é perguntado ao backend, que é quem sabe. */
    const acharUrl = async () =>
      local.state?.url ?? (await analisar(id))?.leitura_url;

    /* A MARCA É LIDA ANTES DE ABRIR O LIVRO, e não em paralelo.
     *
     * O capítulo salvo decide QUAL capítulo carregar. Buscar os dois ao mesmo
     * tempo faria o livro abrir no primeiro e depois pular para o salvo — e
     * pior: o primeiro capítulo teria sido baixado e descartado à toa.
     *
     * O `catch` devolve o começo em vez de propagar. Não conseguir ler a marca
     * é motivo para começar do início, e não para deixar de abrir o livro. */
    lerProgresso(id)
      .catch(() => ({ capitulo: 0, deslocamento: 0, guardado: false }))
      .then(async (marca) => {
        if (!vivo) return;
        setProgresso(marca);
        const url = await acharUrl();
        if (!url) throw new Error("este livro ainda não tem texto para ler");
        const l = await abrirLivro(url, { capitulo: marca?.capitulo ?? 0 });
        if (!vivo) return;
        setLivro(l);
        /* A janela começa no capítulo em que a pessoa parou, e não no primeiro:
           abrir no capítulo 12 e carregar do 1 ao 3 mostraria o começo do livro
           a quem estava no meio. */
        semear(l.capitulo, l.blocos);
        /* Quantos capítulos o livro tem só se descobre ABRINDO: a espinha do
         * EPUB é lida aqui, no navegador. Sem gravar isso, a estante não teria
         * como dizer onde a leitura está — e a alternativa era a porcentagem
         * inventada que a ficha vinha mostrando. */
        gravarProgresso(id, {
          capitulo: l.capitulo,
          deslocamento: marca?.deslocamento ?? 0,
          capitulos: l.capitulos,
          /* A extensão só existe depois de abrir, então esta é a primeira
             chance de gravar a fração — e é o que faz um livro aberto uma vez
             já aparecer com porcentagem na estante. */
          fracao: fracaoLida({
            capitulo: l.capitulo,
            deslocamento: 0,
            extensao: l.extensao,
          }) ?? undefined,
        }).catch(() => {});
      })
      .catch((e) => vivo && setErro(e.message));

    return () => { vivo = false; };
  }, [id]);

  /* A JANELA DE CAPÍTULOS CARREGADOS.
   *
   * A leitura é rolagem contínua — o desenho (895:10472) não tem botão de virar
   * capítulo —, e a objeção contra isso era carregar o livro inteiro na
   * abertura, que trava a aba num livro de oitocentas páginas.
   *
   * A saída, definida pelo Erik, é carregar em janela, como jogo faz com
   * terreno: alguns capítulos por vez, e mais quando a pessoa se aproxima do
   * fim do que já está carregado.
   *
   * TRÊS, E NÃO DEZ. O número dele era sobre imagens, e a unidade aqui é
   * capítulo — um capítulo pode ter cinquenta páginas. Três é o que mantém a
   * rolagem sem costura: o de cima que a pessoa acabou de deixar, o que ela lê,
   * e o de baixo já pronto quando ela chegar. */
  const [janela, setJanela] = useState([]);   // [{ indice, blocos }], em ordem

  /* AS BORDAS DA JANELA FICAM NUM REF, e não são lidas do estado.
   *
   * A primeira versão lia `janela` do closure, e travava: com a rolagem rápida,
   * duas chamadas entram, a segunda carrega o callback de um render anterior, e
   * ela pede um índice que já existe. O `setJanela` deduplica, nada muda na
   * tela, o `IntersectionObserver` não vê mudança de interseção e NUNCA
   * dispara de novo.
   *
   * Medido: a janela crescia 2, 3, 4, 6 e parava — com a sentinela ainda no DOM
   * e `temMais` ainda verdadeiro. Nenhum erro em lugar nenhum; a leitura
   * simplesmente acabava no meio do livro.
   *
   * O ref é atualizado no mesmo lugar em que a janela muda, então ele nunca
   * discorda dela — e não depende de render para valer. */
  const bordas = useRef({ primeiro: 0, ultimo: -1 });
  const carregando = useRef(false);

  const semear = useCallback((indice, blocos) => {
    bordas.current = { primeiro: indice, ultimo: indice };
    setJanela([{ indice, blocos }]);
  }, []);

  /* O capítulo seguinte ao fim da janela. */
  const pedirMais = useCallback(async () => {
    if (carregando.current || !livro) return;
    const proximo = bordas.current.ultimo + 1;
    if (proximo >= livro.capitulos) return;
    carregando.current = true;
    /* A borda avança ANTES da busca. Se ela só avançasse depois, duas chamadas
     * no mesmo instante pediriam o mesmo capítulo — e foi exatamente assim que
     * a janela pulou de 4 para 6 numa medida. */
    bordas.current = { ...bordas.current, ultimo: proximo };
    try {
      const blocos = await blocosDoCapitulo(livro, proximo);
      if (blocos) setJanela((j) => (j.some((c) => c.indice === proximo) ? j : [...j, { indice: proximo, blocos }]));
      else bordas.current = { ...bordas.current, ultimo: proximo - 1 };
    } catch {
      /* Um capítulo que não abre devolve a borda: sem isso ele viraria um buraco
       * permanente, e o resto do livro ficaria inalcançável. */
      bordas.current = { ...bordas.current, ultimo: proximo - 1 };
    } finally { carregando.current = false; }
  }, [livro]);

  /* O CAPÍTULO ANTERIOR AO COMEÇO DA JANELA — e ele é tão necessário quanto o
   * seguinte.
   *
   * A janela abre onde a pessoa parou, e quem parou no capítulo 8 abre o livro
   * ali. Sem carregar para cima, os sete capítulos anteriores ficam
   * inalcançáveis: a rolagem contínua teria tirado os botões de virar e, com
   * eles, a única forma de voltar.
   *
   * Preservar a posição é obrigatório. Inserir conteúdo ACIMA do que está na
   * tela empurra tudo para baixo, e sem compensar a rolagem a pessoa é jogada
   * para trás no meio da leitura — o defeito clássico de lista infinita
   * bidirecional. */
  const pedirAntes = useCallback(async () => {
    if (carregando.current || !livro) return;
    const anterior = bordas.current.primeiro - 1;
    if (anterior < 0) return;
    carregando.current = true;
    bordas.current = { ...bordas.current, primeiro: anterior };
    const alturaAntes = document.documentElement.scrollHeight;
    const ondeEstava = window.scrollY;
    try {
      const blocos = await blocosDoCapitulo(livro, anterior);
      if (blocos) {
        setJanela((j) => (j.some((c) => c.indice === anterior) ? j : [{ indice: anterior, blocos }, ...j]));
        /* Espera o navegador desenhar, e devolve a diferença de altura à
         * rolagem. Sem isto o texto salta sob os olhos de quem lê. */
        requestAnimationFrame(() => {
          const cresceu = document.documentElement.scrollHeight - alturaAntes;
          if (cresceu > 0) window.scrollTo({ top: ondeEstava + cresceu, behavior: "instant" });
        });
      } else bordas.current = { ...bordas.current, primeiro: anterior + 1 };
    } catch {
      bordas.current = { ...bordas.current, primeiro: anterior + 1 };
    } finally { carregando.current = false; }
  }, [livro]);

  /* QUANTO DO LIVRO JÁ FOI LIDO, de 0 a 1.
   *
   * `deslocamento` é posição de CARACTERE dentro do capítulo, então virar
   * fração exige os caracteres do capítulo aberto — que só existem aqui, com os
   * blocos em mãos. A extensão dos outros capítulos vem em bytes do índice do
   * zip; as duas medidas são diferentes, e é por isso que a de dentro é
   * normalizada para 0–1 antes de entrar na conta.
   *
   * Devolve `undefined` quando não dá para saber, e `gravarProgresso` então não
   * manda o campo — em vez de gravar zero, que afirmaria "no começo". */
  const quanto = (cap, desl) => {
    if (!livro?.extensao?.length) return undefined;
    /* Os caracteres do capítulo QUE ESTÁ SENDO LIDO, e não os do primeiro da
     * janela: com vários na tela, dividir o deslocamento de um pelo tamanho de
     * outro dá uma fração que não quer dizer nada. */
    const daJanela = janela.find((c) => c.indice === cap);
    const fonte = daJanela?.blocos ?? livro.blocos ?? [];
    const total = fonte.reduce((n, b) => n + (b.texto?.length ?? 0), 0);
    const dentro = total > 0 ? Math.min(1, (desl ?? 0) / total) : 0;
    const f = fracaoLida({ capitulo: cap, deslocamento: dentro, extensao: livro.extensao });
    return f === null ? undefined : f;
  };

  /* SALTAR PARA UM CAPÍTULO, a partir do índice do livro.
   *
   * A janela é REPLANTADA no capítulo pedido, e não estendida até ele: quem
   * está no capítulo 2 e clica no 30 não quer os vinte e oito do meio
   * carregados — seriam megabytes e uma página de rolagem que ninguém pediu.
   *
   * A rolagem sobe para o topo porque a página inteira trocou de conteúdo:
   * ficar na mesma altura mostraria o meio de um capítulo que a pessoa acabou
   * de escolher pelo começo. */
  const saltarPara = useCallback(async (indice) => {
    if (!livro || indice < 0 || indice >= livro.capitulos) return;
    if (bordas.current.primeiro === indice && bordas.current.ultimo === indice) return;
    carregando.current = true;
    try {
      const blocos = await blocosDoCapitulo(livro, indice);
      if (!blocos) return;
      semear(indice, blocos);
      window.scrollTo({ top: 0, behavior: "auto" });
      gravarProgresso(id, {
        capitulo: indice,
        deslocamento: 0,
        fracao: fracaoLida({ capitulo: indice, deslocamento: 0, extensao: livro.extensao }) ?? undefined,
      }).catch(() => {});
    } finally {
      carregando.current = false;
    }
  }, [livro, id, semear]);

  /* Sem o livro, o exemplo — e o produto DIZ que é exemplo, em vez de deixar
   * parecer que aquele é o teu texto. */
  if (erro || !livro) {
    return (
      <GavetaDeLeitura titulo="Leitura" voltarPara={`/estante/${id}`}>
        <Leitura
          livro={EXEMPLO_LEITURA}
          voltarPara={`/estante/${id}`}
          aviso={erro ? `Este é um texto de exemplo. O livro não pôde ser aberto: ${erro}` : null}
        />
      </GavetaDeLeitura>
    );
  }

  return (
    <GavetaDeLeitura titulo={`Leitura de ${livro.titulo}`} voltarPara={`/estante/${id}`}>
      <Leitura
        livro={livro}
        voltarPara={`/estante/${id}`}
        capitulos={janela}
        aoPedirMais={pedirMais}
        aoPedirAntes={pedirAntes}
        temMais={janela.length > 0 && janela[janela.length - 1].indice < livro.capitulos - 1}
        temAntes={janela.length > 0 && janela[0].indice > 0}
        aoIrParaCapitulo={saltarPara}
        progresso={progresso}
        notas={notas}
        erroDeNota={erroDeNota}
        marcadores={marcadores}
        erroDeMarcador={erroDeMarcador}
        aoDobrar={dobrar}
        aoDesdobrar={desdobrar}
      /* O capítulo vem daqui, e não da seleção: quem marca um trecho está no
       * capítulo aberto, e pedir isso à tela seria pedir que ela repita algo que
       * já se sabe — e que pode discordar. */
        aoAnotar={(t) => marcar({ ...t, capitulo: t.capitulo ?? livro.capitulo ?? 0 })}
        aoComentar={comentar}
        aoTrocarCor={trocarCor}
        aoApagarNota={remover}
        aoMarcar={({ capitulo, deslocamento }) => {
        /* O CAPÍTULO VEM DA TELA, e não do estado. Com a rolagem contínua há
           vários na página, e `livro.capitulo` é só o que foi aberto primeiro —
           usá-lo faria toda a leitura ser gravada como se fosse no capítulo de
           entrada, e reabrir o livro voltaria para lá.

           Falha em silêncio: isto roda enquanto a pessoa lê, e um erro visível a
           cada rolagem de quem não entrou faria o produto parecer quebrado
           quando o que acontece é o previsto — sem conta não há onde guardar. */
          gravarProgresso(id, {
            capitulo,
            deslocamento,
            fracao: quanto(capitulo, deslocamento),
          }).catch(() => {});
        }}
      />
    </GavetaDeLeitura>
  );
}

/* Rota que não existe não é erro do usuário: é o produto ainda não ter chegado
 * ali. Cai no lugar mais próximo, e diz. */
function NaoEncontrada() {
  const { pathname } = useLocation();
  return (
    <AindaNao
      lugar={{
        rotulo: "Este endereço não existe",
        oQueE: `Nada responde em ${pathname}.`,
      }}
    />
  );
}

/* Uma página que só existe para quem entrou.
 *
 * Enquanto NÃO SE SABE, não decide nada: mandar para /entrar durante a
 * verificação faria quem já está logado ser expulso a cada abertura de página,
 * e voltar sozinho um instante depois.
 *
 * SEM CONTA, EXPLICA ANTES DE EMPURRAR. Era um `<Navigate to="/entrar" replace>`
 * — a pessoa clicava em Estante e chegava num campo de e-mail, sem uma palavra
 * sobre o que aconteceu, e com o voltar do navegador inútil porque `replace`
 * apaga de onde ela veio. O nó 941:23106 é essa palavra. */
function SoParaQuemEntrou({ acesso, lugar, children }) {
  if (acesso.carregando) return <main className="carregando" aria-busy="true" />;
  if (!acesso.pessoa) return <CriarConta lugar={lugar} />;
  return children;
}

function PaginaCanvas() {
  const { nos, ligacoes, secoes, livros, erro, trazer, trazerMidia, trazerLivro, mover, moverLivro, tirar, editarTexto, tirarLivro, ligar, desligar, criarSecao, mudarSecao, dissolverSecao, devolverSecao } = usarCanvas();
  const [notas, setNotas] = useState([]);
  /* A ESTANTE INTEIRA, para a folha de "trazer" poder oferecer livros. É a
   * mesma lista da tela de Estante — o Canvas não tem acervo próprio. */
  const { livros: acervo, carregarEstante } = useJornada();

  /* TODAS as notas, para a folha de "trazer" saber o que existe. O Canvas
   * mostra só as que estão na superfície; escolher entre as outras exige
   * conhecê-las. */
  useEffect(() => {
    let vivo = true;
    lerTodasAsNotas().then((n) => vivo && setNotas(n)).catch(() => {});
    return () => { vivo = false; };
  }, [nos.length]);

  useEffect(() => { carregarEstante?.(); }, [carregarEstante]);

  return (
    <Canvas
      nos={nos}
      ligacoes={ligacoes}
      secoes={secoes}
      notas={notas}
      erro={erro}
      aoTrazer={trazer}
      aoTrazerMidia={trazerMidia}
      livros={livros}
      acervo={acervo}
      aoTrazerLivro={trazerLivro}
      aoMoverLivro={moverLivro}
      aoTirarLivro={tirarLivro}
      aoMover={mover}
      aoTirar={tirar}
      aoEditarNota={editarTexto}
      aoLigar={ligar}
      aoDesligar={desligar}
      aoCriarSecao={criarSecao}
      aoMudarSecao={mudarSecao}
      aoDissolverSecao={dissolverSecao}
      aoDevolverSecao={devolverSecao}
    />
  );
}

function PaginaEstudos() {
  const { estudos, erro, criar, mudar, apagar, reunir, tirar } = usarEstudos();
  const [notas, setNotas] = useState([]);
  /* A VISTA "LEITURA" DOS ESTUDOS precisa dos livros: ela é um quadro dos
     livros por estado de leitura, e nada disso sai dos estudos. */
  const { livros, carregarEstante } = useJornada();

  useEffect(() => {
    let vivo = true;
    lerTodasAsNotas().then((n) => vivo && setNotas(n)).catch(() => {});
    return () => { vivo = false; };
  }, [estudos.length]);

  useEffect(() => { carregarEstante().catch(() => {}); }, [carregarEstante]);

  return (
    <Estudos
      estudos={estudos}
      notas={notas}
      livros={livros}
      erro={erro}
      aoCriar={criar}
      aoMudar={mudar}
      aoApagar={apagar}
      aoReunir={reunir}
      aoTirar={tirar}
      /* Depois de zerar a marca de um livro, a estante precisa ser relida: a
         coluna do quadro é DERIVADA da fração, e sem reler o livro fica onde
         estava até alguém recarregar a página. */
      aoReler={() => carregarEstante().catch(() => {})}
    />
  );
}

function PaginaEstudo() {
  const { id } = useParams();
  const { estudos, erro, carregando, mudar, apagar, reunir, tirar } = usarEstudos();
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    let vivo = true;
    lerTodasAsNotas().then((n) => vivo && setNotas(n)).catch(() => {});
    return () => { vivo = false; };
  }, [estudos.length]);

  /* `carregando` VEM DO HOOK, e nao de "a lista ainda esta vazia".
   *
   * Eu o derivei de `!estudos.length` primeiro, e uma conta sem nenhum estudo
   * ficava presa em "Buscando o estudo…" PARA SEMPRE — a condicao nunca deixava
   * de ser verdadeira. O hook ja sabe a diferenca entre "ainda nao respondeu" e
   * "respondeu vazio", e era so perguntar a ele. */
  const estudo = estudos.find((e) => String(e.id) === String(id)) ?? null;

  return (
    <EstudoPagina
      estudo={estudo}
      notas={notas}
      erro={erro}
      carregando={carregando}
      aoMudar={mudar}
      aoApagar={apagar}
      aoReunir={reunir}
      aoTirar={tirar}
    />
  );
}

function PaginaNotas() {
  const [notas, setNotas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(() => {
    lerTodasAsNotas()
      .then(setNotas)
      .catch(() => setNotas([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { buscar(); }, [buscar]);

  return (
    <Notas
      notas={notas}
      carregando={carregando}
      /* A importação do Kindle vive aqui agora — o botão que estava na estante
         não existe no desenho dela. */
      aoImportar={async (f) => { const r = await importarClippings(f); buscar(); return r; }}
      aoApagar={async (n) => {
        /* Apagar de VERDADE, e não tirar de uma lista: aqui é o lugar onde a
         * nota mora. No Canvas e no estudo, "tirar" desfaz a reunião; aqui não
         * há reunião para desfazer. */
        if (!n.job_id) return;
        await apagarNota(n.job_id, n.id);
        buscar();
      }}
    />
  );
}

/* O caminho sem o número: `/leitura/:id` e não `/leitura/37`.
 *
 * Usado pelo recado e pela medição, e por isso mora fora dos dois: o número do
 * livro não ajuda a consertar nada e conta o que a pessoa está lendo. Duas
 * cópias desta linha seria uma delas ficando para trás no dia em que aparecer
 * uma rota nova com parâmetro. */
function semParametro(caminho) {
  return caminho
    .replace(/^\/(leitura|preparo|estante|nota|estudo)\/[^/]+$/, "/$1/:id")
    .slice(0, 120);
}

/* A FOLHA DE RECADO MORA AQUI, uma só para o produto inteiro.
 *
 * Ela precisa estar DENTRO do `BrowserRouter` — `useLocation` é o que diz em que
 * tela a pessoa estava quando escreveu, e sem isso o recado chega sem contexto:
 * "não entendi" dito na Mesa e dito na Leitura são dois problemas diferentes.
 *
 * O caminho vai SEM o parâmetro: `/leitura/:id` e não `/leitura/37`. O número do
 * livro não ajuda a consertar nada e conta o que a pessoa estava lendo.
 */
function FolhaDeRecado({ temConta }) {
  const [aberta, setAberta] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const abrir = () => setAberta(true);
    window.addEventListener(RECADO_PEDIDO, abrir);
    return () => window.removeEventListener(RECADO_PEDIDO, abrir);
  }, []);

  const onde = semParametro(pathname);

  return (
    <Recado
      aberta={aberta}
      aoFechar={() => setAberta(false)}
      onde={onde}
      temConta={temConta}
    />
  );
}

/* A TROCA DE TELA É UM ACONTECIMENTO, e o roteador é quem sabe dela.
 *
 * O `capture_pageview` automático do PostHog só vê a primeira: daqui para
 * frente quem troca a tela é o `react-router`, sem o navegador recarregar nada.
 * Sem isto, a medição inteira diria que todo mundo abre a Mesa e nunca sai.
 *
 * O caminho vai SEM o parâmetro, pela mesma razão do recado: `/leitura/:id` não
 * conta o que a pessoa está lendo, e `/leitura/37` conta.
 */
function MedirTrocaDeTela() {
  const { pathname } = useLocation();
  useEffect(() => {
    medirTela(semParametro(pathname));
  }, [pathname]);
  return null;
}

/* A ÁREA DA CONTA: a gaveta que abre uma vez e fica.
 *
 * O cabeçalho, o chão e a folha moram AQUI, e não em cada uma das cinco telas.
 * Antes cada tela trazia a própria gaveta, e trocar de aba dentro da conta
 * desmontava e remontava tudo — a folha subia de novo a cada clique, que é o
 * que o Erik chamou de enjoativo e que a primeira pergunta do manual de animação
 * já responde: o que a pessoa vê dezenas de vezes por dia não anima.
 *
 * O `Outlet` é onde a tela da vez entra. Ela troca; a gaveta não.
 */
function AreaDaConta({ pessoa }) {
  return (
    <div className="mesa chao">
      <Cabecalho />
      <GavetaDeSecao titulo="Sua conta">
        <div className="conta">
          <MenuDaConta pessoa={pessoa} />
          <Outlet />
        </div>
      </GavetaDeSecao>
    </div>
  );
}

export function App() {
  const acesso = usePessoa();

  /* Se a pessoa já disse sim numa visita anterior, liga sem perguntar de novo.
   * Dentro do `App` e não no `main.jsx` porque ele espera a primeira pintura, e
   * o `main.jsx` roda antes dela. */
  useEffect(() => {
    ligarMedicao();
  }, []);

  return (
    <BrowserRouter>
      <MedirTrocaDeTela />
      <Consentimento />
      <FolhaDeRecado temConta={Boolean(acesso.pessoa)} />
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        {/* A LP E A PRIMEIRA TELA DO PROJETO.
            Ela morava em `/apresentacao`, e "/" era a Mesa — com um comentario
            aqui defendendo isso. Estava invertido: quem chega no Mekora chega na
            apresentacao, e so depois de entrar cai na Estante. A Mesa e onde o
            arquivo e preparado, e isso nao e a porta de entrada do produto. */}
        <Route path="/" element={<PaginaApresentacao />} />
        {/* `/apresentacao` continua respondendo: ela foi divulgada, e link que
            existiu e some vira 404 na cara de quem guardou. */}
        <Route path="/apresentacao" element={<Navigate to="/" replace />} />
        {/* Publicas: quem ainda nao entrou tem duvida, e quem nunca vai entrar
            tem direito de saber o que mudou. */}
        <Route path="/ajuda" element={<Ajuda />} />
        <Route path="/atualizacoes" element={<Atualizacoes />} />

        {/* O CATÁLOGO DOS COMPONENTES — a pergunta C19 do `ABERTO.md`.
         *
         * SÓ EXISTE EM DESENVOLVIMENTO. `import.meta.env.DEV` é constante em
         * tempo de compilação: em produção a condição vira `false`, o Rollup
         * corta o ramo, e o `Sistema.jsx` nem entra no pacote. A rota não existe
         * como caminho nem como código.
         *
         * A razão de não ser produto: o escopo da V1 é o Figma inteiro, e uma
         * tela que o Figma não tem seria eu acrescentando escopo sozinho. Isto é
         * instrumento, como o `scripts/portao.js` — serve para OLHAR o que já
         * existe, lado a lado, em estados que de outro modo só aparecem um por
         * vez dentro da tela onde moram. */}
        {import.meta.env.DEV && <Route path="/sistema" element={<Sistema />} />}
        {/* O DOCUMENTO, e nao a tela de Privacidade da conta. Aquela mostra o
            que A SUA conta tem, com contagem; estas duas dizem o que vale para
            qualquer pessoa. Publicas, e sem exigir conta: quem esta decidindo se
            cria uma precisa poder ler antes.

            O NOME LONGO NAO E ENFEITE: `/privacidade` COLIDE com a rota de API
            de mesmo nome, e o scripts/rotas.py recusou — "a borda nao tem como
            servir as duas". E e como as pessoas citam esses documentos. */}
        <Route path="/politica-de-privacidade" element={<Politicas />} />
        <Route path="/termos-de-uso" element={<Politicas />} />
        <Route path="/mesa" element={<Mesa />} />
        {/* A estante É a conta (DEC-0018). Sem entrar não há o que listar —
            e listar tudo seria mostrar a estante de todo mundo. */}
        <Route path="/estante" element={<SoParaQuemEntrou acesso={acesso} lugar="a Estante"><PaginaEstante /></SoParaQuemEntrou>} />
        <Route path="/leitura/:id" element={<PaginaLeitura />} />
        {/* O Canvas é de computador (ver `lugares.js`). No telefone a rota abre a
            explicação, e não a tela: o lugar existe, só não neste tamanho. */}
        <Route path="/canvas" element={<SoParaQuemEntrou acesso={acesso} lugar="o Canvas"><SoNoComputador lugar={LUGARES.find((l) => l.id === "canvas")}><PaginaCanvas /></SoNoComputador></SoParaQuemEntrou>} />
        <Route path="/estudos" element={<SoParaQuemEntrou acesso={acesso} lugar="os Estudos"><PaginaEstudos /></SoParaQuemEntrou>} />
        <Route path="/estudo/:id" element={<SoParaQuemEntrou acesso={acesso} lugar="um Estudo"><PaginaEstudo /></SoParaQuemEntrou>} />
        <Route path="/notas" element={<SoParaQuemEntrou acesso={acesso} lugar="as suas notas"><PaginaNotas /></SoParaQuemEntrou>} />
        <Route path="/estante/:id" element={<SoParaQuemEntrou acesso={acesso} lugar="um livro da Estante"><Livro /></SoParaQuemEntrou>} />
        <Route path="/nota/:id" element={<SoParaQuemEntrou acesso={acesso} lugar="uma nota sua"><Nota /></SoParaQuemEntrou>} />
        {/* O preparo NÃO exige conta: converter sem cadastro é garantido pela
            DEC-0018, e esta é a tela que decide a conversão. */}
        <Route path="/preparo/:id" element={<Preparo />} />
        {LUGARES.filter((l) => !l.pronto && !["/canvas", "/estudos"].includes(l.rota)).map((l) => (
          <Route key={l.id} path={l.rota} element={<AindaNao lugar={l} />} />
        ))}
        {/* Conta tem quatro páginas; só Preferências existe. As outras usam a
            mesma tela de "ainda não", que nomeia o lugar em vez de dar 404. */}
        {/* AS CINCO TELAS DA CONTA SÃO UMA GAVETA SÓ, e é por isso que elas
            viraram rotas ANINHADAS.
            
            O Erik apontou: "acho legal ele no início e para sair, porém para
            todas as telas já fica ruim — todo clique iniciando uma animação é
            mais enjoativo que funcional". Está certo, e é a primeira pergunta
            do manual de animação: quantas vezes por dia a pessoa vê isto?
            Trocar de aba dentro da conta é ação de dezenas de vezes; abrir e
            fechar a conta é de poucas.
            
            Cada tela renderizava a própria `GavetaDeSecao`, então navegar entre
            elas DESMONTAVA e remontava a gaveta — e a folha subia de novo a cada
            clique. Agora a gaveta é o `element` da rota-mãe: ela monta quando se
            entra na conta, some quando se sai, e as cinco trocam DENTRO dela
            sem animação nenhuma. */}
        <Route
          path="/conta"
          element={
            <SoParaQuemEntrou acesso={acesso}>
              <AreaDaConta pessoa={comoChamar(acesso.pessoa)} />
            </SoParaQuemEntrou>
          }
        >
          {/* A visao geral, que ate 01/09 nao existia: `/conta` renderizava a
              tela de Dispositivos Kindle, e a trilha da conta prometia quatro
              destinos com dois abrindo a mesma coisa.
              `aoMudarPerfil` faz o `usePessoa` perguntar de novo: sem isso,
              trocar o nome ou o retrato so aparece no proximo carregamento. */}
          <Route index element={<ContaVisao pessoa={comoChamar(acesso.pessoa)} aoMudarPerfil={acesso.conferir} />} />
          <Route path="preferencias" element={<Conta pessoa={comoChamar(acesso.pessoa)} />} />
          <Route path="seguranca" element={<ContaSeguranca pessoa={comoChamar(acesso.pessoa)} />} />
          <Route path="kindle" element={<ContaKindle pessoa={comoChamar(acesso.pessoa)} />} />
          <Route
            path="privacidade"
            element={
              <Privacidade
                pessoa={comoChamar(acesso.pessoa)}
                /* Depois de apagar, a sessão não existe mais no servidor.
                 * Reconferir em vez de mandar para uma rota fixa deixa o
                 * guarda decidir — e ele já sabe levar quem não tem conta
                 * para a tela de entrar. */
                aoApagarConta={acesso.conferir}
              />
            }
          />
        </Route>
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}
