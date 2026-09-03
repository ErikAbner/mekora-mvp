import { useCallback, useEffect, useRef, useState } from "react";
import {
  apagarGrupo, criarGrupo, desligarNotas, lerCanvas, ligar as ligarNoServidor, moverNoCanvas,
  moverLivroNoCanvas, mudarGrupo, porLivroNoCanvas, voltarGrupo, porMidiaNoCanvas, porNoCanvas,
  tirarDoCanvas, tirarLivroDoCanvas,
} from "../../../contrato/api.js";

/* A superfície do Canvas.
 *
 * MOVER GRAVA DEPOIS QUE O ARRASTO ACABA, e não durante. Arrastar produz dezenas
 * de posições por segundo, e gravar cada uma mandaria centenas de pedidos para
 * registrar lugares por onde a nota só passou. O que interessa é onde ela ficou.
 *
 * A posição na tela é do componente enquanto o dedo está apertado; aqui só entra
 * o que foi solto.
 */
export function usarCanvas() {
  const [nos, setNos] = useState([]);
  const [ligacoes, setLigacoes] = useState([]);
  const [secoes, setSecoes] = useState([]);
  const [livros, setLivros] = useState([]);

  /* AS LISTAS TAMBÉM CHEGAM POR `ref`, e a razão é de desempenho — medida.
   *
   * `tirar`, `tirarLivro`, `mudarSecao` e `dissolverSecao` guardavam a lista de antes
   * para poder desfazer a mudança otimista se o servidor recusasse. Isso as
   * punha nas dependências, e elas trocavam de identidade a cada mudança de
   * lista — indo como propriedade para as 123 notas memoizadas, que redesenhavam
   * todas a cada commit.
   *
   * Medido, com 123 cartões: o quadro do commit custava 66ms. É a mesma classe
   * de defeito que `usarHistoria` tinha, e vale registrar como padrão: função
   * que vai como propriedade para muitos filhos não pode depender de lista. */
  const nosVivos = useRef([]);
  const secoesVivas = useRef([]);
  const livrosVivos = useRef([]);
  nosVivos.current = nos;
  secoesVivas.current = secoes;
  livrosVivos.current = livros;
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const d = await lerCanvas();
      setNos(d.nos ?? []);
      setLigacoes(d.ligacoes ?? []);
      /* `grupos` é o nome NO FIO, e ele fica: renomear a tabela e a rota custa
       * uma migração de SQLite por nenhum ganho para quem usa. A tradução para o
       * vocabulário do produto acontece aqui, na entrada, e é a única linha do
       * front que ainda precisa saber do nome antigo. */
      setSecoes(d.grupos ?? []);
      setLivros(d.livros ?? []);
    } catch {
      setNos([]);
      setLigacoes([]);
      setLivros([]);
      setSecoes([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const trazer = useCallback(async (o) => {
    setErro(null);
    try {
      /* DEVOLVE O NÓ CRIADO, e não `true`.
       *
       * Quem chama precisa do id para poder DESFAZER: sem ele, criar uma nota
       * era a única ação da superfície sem volta — medido na matriz de
       * desfazer, 106 → 107 → 107. Objeto continua sendo verdadeiro, então
       * `if (await aoTrazer(...))` segue valendo. */
      const criado = await porNoCanvas(o);
      /* Recarrega em vez de remendar: trazer uma nota que já estava na
       * superfície não cria nada, e remendar a lista duplicaria o retângulo na
       * tela até a próxima visita. */
      await recarregar();
      return criado ?? true;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, [recarregar]);

  const trazerMidia = useCallback(async (arquivo, x, y, legenda) => {
    setErro(null);
    try {
      await porMidiaNoCanvas(arquivo, x, y, legenda);
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }, [recarregar]);

  /* O LIVRO ENTRA POR REFERÊNCIA. `recarregar` em vez de remendar porque o
   * servidor devolve título, autor e capa resolvidos — o cartão precisa deles
   * para se parecer com um livro, e a tela não os tem. */
  /* DESAPAGAR UMA SEÇÃO — a mesma, com o mesmo id. Ver `apagado_em` no modelo:
   * recriar daria um objeto que só se parece com o anterior. */
  const devolverSecao = useCallback(async (id) => {
    try {
      await voltarGrupo(id);
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }, [recarregar]);

  const trazerLivro = useCallback(async (jobId, x, y) => {
    setErro(null);
    try {
      await porLivroNoCanvas(jobId, x, y);
      await recarregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }, [recarregar]);

  const moverLivro = useCallback(async (id, x, y, largura, grupo) => {
    setLivros((atual) =>
      atual.map((l) => (l.id === id
        ? { ...l, x, y, ...(largura === undefined ? {} : { largura }), ...(grupo === undefined ? {} : { grupo_id: grupo }) }
        : l)),
    );
    try {
      await moverLivroNoCanvas(id, x, y, largura, grupo);
    } catch (e) {
      setErro(e.message);
      await recarregar();
    }
  }, [recarregar]);

  /* TIRAR O LIVRO DA SUPERFÍCIE NÃO APAGA O LIVRO. Some a posição; o arquivo, as
   * notas e o lugar na estante ficam. É a mesma distinção que "tirar" já faz com
   * a nota, e ela precisa continuar valendo para qualquer objeto. */
  const tirarLivro = useCallback(async (id) => {
    const antes = livrosVivos.current;
    setLivros((atual) => atual.filter((l) => l.id !== id));
    try {
      await tirarLivroDoCanvas(id);
    } catch (e) {
      setLivros(antes);
      setErro(e.message);
    }
  }, []);

  const mover = useCallback(async (id, x, y, largura, grupo) => {
    setNos((atual) =>
      atual.map((n) => (n.id === id
        ? { ...n, x, y, ...(largura === undefined ? {} : { largura }), ...(grupo === undefined ? {} : { grupo_id: grupo }) }
        : n)),
    );
    try {
      await moverNoCanvas(id, x, y, largura, grupo);
    } catch (e) {
      setErro(e.message);
      await recarregar();
    }
  }, [recarregar]);

  const tirar = useCallback(async (id) => {
    const antes = nosVivos.current;
    setNos((atual) => atual.filter((n) => n.id !== id));
    try {
      await tirarDoCanvas(id);
      /* As ligações da nota tirada somem junto no servidor, por CASCADE. Sem
       * recarregar, elas continuariam desenhadas para lugar nenhum. */
      await recarregar();
    } catch (e) {
      setNos(antes);
      setErro(e.message);
    }
  }, [recarregar]);

  const ligar = useCallback(async (a, b) => {
    setErro(null);
    try {
      /* Devolve `{id, ja_existia}`: o id para desfazer, e `ja_existia` porque a
       * rota é idempotente — repetir um par existente responde 201 sem criar
       * nada, e registrar um passo de história ali faria `⌘Z` apagar uma
       * ligação que a pessoa não acabou de fazer. */
      const feita = await ligarNoServidor(a, b);
      await recarregar();
      return feita ?? null;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, [recarregar]);

  const desligar = useCallback(async (id) => {
    setLigacoes((atual) => atual.filter((l) => l.id !== id));
    try {
      await desligarNotas(id);
    } catch (e) {
      setErro(e.message);
      await recarregar();
    }
  }, [recarregar]);

  /* OS GRUPOS. Mover e redimensionar seguem a mesma regra do nó: a tela move o
   * retângulo enquanto o dedo está apertado, e só o que foi SOLTO chega aqui.
   * Gravar durante o arrasto mandaria centenas de pedidos para registrar
   * lugares por onde a área só passou. */
  const criarSecao = useCallback(async (g) => {
    setErro(null);
    try {
      const novo = await criarGrupo(g);
      setSecoes((atual) => [...atual, novo]);
      return novo;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, []);

  const mudarSecao = useCallback(async (id, troca) => {
    const antes = secoesVivas.current;
    setSecoes((atual) => atual.map((g) => (g.id === id ? { ...g, ...troca } : g)));
    try {
      await mudarGrupo(id, troca);
    } catch (e) {
      setSecoes(antes);
      setErro(e.message);
    }
  }, []);

  const dissolverSecao = useCallback(async (id) => {
    const antes = secoesVivas.current;
    setSecoes((atual) => atual.filter((g) => g.id !== id));
    try {
      await apagarGrupo(id);
    } catch (e) {
      setSecoes(antes);
      setErro(e.message);
    }
  }, []);

  return {
    nos, ligacoes, secoes, livros, erro, carregando,
    trazer, trazerMidia, trazerLivro, mover, moverLivro, tirar, tirarLivro, ligar, desligar, recarregar,
    criarSecao, mudarSecao, dissolverSecao, devolverSecao,
  };
}
