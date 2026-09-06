/* As provas do livro de recusas — um comando que sabe ficar vermelho.
 *
 *     node scripts/provas.mjs r03        # uma
 *     node scripts/provas.mjs --provar   # o controle negativo de todas
 *
 * POR QUE ELAS MORAM JUNTAS
 * =========================
 * O `docs/REJEITADO.md` só aceita fechar um item com uma prova: um comando que
 * falha enquanto o defeito está lá. Escrever cada uma como arquivo solto
 * espalharia dez scripts quase iguais — o que muda entre eles é a asserção, e
 * não o aparato. Aqui o aparato é um só e a asserção é uma função.
 *
 * AS DE TELA PRECISAM DO SERVIDOR, E FALHAM SEM ELE — DE PROPÓSITO.
 * ================================================================
 * Uma prova que passa quando não conseguiu medir é verde por omissão, que é o
 * defeito mais caro deste repositório. Sem `vite` em pé, elas dizem isso e
 * saem com erro. O item volta a aparecer como REGREDIU até alguém subir o
 * servidor — chato e honesto, nessa ordem.
 *
 * O CONTROLE NEGATIVO É PARTE DA PROVA, e vai nos DOIS sentidos: cada uma roda
 * limpa (tem de passar) e envenenada (tem de reprovar). As de arquivo recebem
 * o texto mutilado; as de tela recebem um veneno de CSS ou de DOM injetado na
 * própria página, que refaz o defeito que o Erik descreveu.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const WEB = process.env.MEKORA_WEB || 'http://localhost:5180';
const arq = (p) => readFileSync(RAIZ + p, 'utf8');

/* ── o aparato de tela ──────────────────────────────────────────────────── */

let sessaoGuardada = null;
function sessao() {
  if (sessaoGuardada) return sessaoGuardada;
  const saida = execSync('scripts/sessao-de-prova.sh', {
    cwd: RAIZ, encoding: 'utf8', timeout: 90000,
    env: { ...process.env, MEKORA_PROVA: process.env.MEKORA_PROVA || RAIZ + '.ver' },
  });
  /* TRES LINHAS: token, livro, e o trabalho parado em `analyzed`. O terceiro
     existe porque `/preparo/:id` medido sobre um livro ja convertido cai na
     tela de espera, e foi assim que o no 966:31504 ficou sem medida nenhuma:
     a rota era visitada, a cobertura ficava verde, e a tela medida era outra. */
  const [token, livro, analisado] = saida.trim().split('\n');
  sessaoGuardada = { token, livro, analisado };
  return sessaoGuardada;
}

/* `tamanho` existe porque uma decisao pode ser SOBRE o tamanho da tela.
   O Canvas e de computador, e uma prova que so sabe medir a 1440 nao consegue
   nem ver o defeito nem provar que o conserto nao apagou o Canvas do
   computador. O padrao continua 1440x1000: nenhuma prova antiga muda. */
/* Escreve o estado de conversão de um trabalho direto no banco da bancada.
   `_sessao.py` faz a escrita; aqui só se diz qual trabalho e para qual lado. */
function mudaEstado(jobId, lado) {
  const banco = join(process.env.MEKORA_PROVA || RAIZ + '.ver', 'storage', 'kindle_tool.db');
  execFileSync('python3', ['scripts/_sessao.py', banco, 'nao-importa@teste.local', lado, String(jobId)],
    { cwd: RAIZ, encoding: 'utf8', timeout: 30000 });
}

/* `tamanho.mouse` LEVA O PONTEIRO a um seletor antes da medida. Existe porque
   `:hover` não se alcança de outro jeito: `--gesto` aperta o botão, e apertar um
   cartão da Estante o seleciona — outro estado. Ver `medir.mjs --mouse=`. */
function medir(rota, corpo, veneno = '', tamanho = {}) {
  const { token, livro, analisado } = sessao();
  const dir = join(tmpdir(), 'mekora-provas');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const alvo = join(dir, `m-${Date.now()}.js`);
  /* O VENENO ENTRA ANTES DA MEDIDA, na mesma página: é assim que o controle
     negativo refaz o defeito sem tocar no produto. */
  /* O VENENO VAI DENTRO DE UM BLOCO, e o motivo custou uma rodada: ele e a
     medida declaram nomes curtos — `const b` nos dois —, e no mesmo escopo isso
     e `Identifier 'b' has already been declared`. O arquivo nem chegava a
     rodar, e o erro chegava aqui como "nao consegui medir", que parece falta de
     servidor. Erro de sintaxe disfarcado de ambiente e o pior tipo. */
  /* DUAS ARMADILHAS DE ESCRITA NESTE ARQUIVO, as duas pagas:
       · CRASE dentro do corpo da medida FECHA o literal. Comentario com
         `nome-de-classe` entre crases quebra o arquivo inteiro com
         "missing ) after argument list" — que tambem parece outra coisa.
       · CONTRABARRA e comida pelo literal. `\s` numa expressao regular vira
         `s`, e `/enviar[\s\S]{0,24}kindle/` virou uma classe [sS] que nao casa
         espaco: a prova do R-05 reprovou limpa e envenenada, com a tela certa
         nos dois casos. Escreva `\\s`, ou nao precise dela. */
  writeFileSync(alvo, `(async () => {\n  const esperar = ms => new Promise(r => setTimeout(r, ms));\n  await esperar(3200);\n  {\n${veneno}\n  }\n  ${corpo}\n})()`);
  /* `{CONVERTENDO}` ESCREVE NO BANCO ANTES DE MEDIR, e DESFAZ depois.
     
     É o caso do R-54: chegar no endereço com o servidor já convertendo, sem ter
     clicado nada nesta aba. O trabalho é o mesmo `analisado` — a bancada tem uma
     pessoa por rodada, e deixá-lo em conversão faria a prova seguinte medir
     outra tela sem saber por quê. Daí o `finally` lá embaixo. */
  const emConversao = rota.includes('{CONVERTENDO}');
  if (emConversao) mudaEstado(analisado, 'convertendo');
  const url = `${WEB}${rota.replace('{LIVRO}', livro).replace('{ANALISADO}', analisado).replace('{CONVERTENDO}', analisado)}`;
  let bruto;
  try {
    const largura = String(tamanho.largura || 1440);
    const altura = String(tamanho.altura || 1000);
    const extras = tamanho.mouse ? [`--mouse=${tamanho.mouse}`] : [];
    bruto = execFileSync('node', ['scripts/medir.mjs', url, largura, altura, alvo, `--sessao=${token}`, ...extras],
      { cwd: RAIZ, encoding: 'utf8', timeout: 110000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    throw new NaoPodeMedir(`nao consegui medir ${url} — o servidor de desenvolvimento esta em pe? (${String(e.message).slice(0, 90)})`);
  } finally {
    if (emConversao) mudaEstado(analisado, 'parado');
  }
  const i = bruto.indexOf('{');
  if (i < 0) throw new Error('a medida nao devolveu JSON: ' + bruto.trim().slice(-120));
  return JSON.parse(bruto.slice(i));
}

/* Nao poder medir e uma terceira resposta, ao lado de "passa" e "reprova".
   Confundi-la com reprovacao inventa regressao; confundi-la com aprovacao e o
   verde por omissao. Ela tem classe propria para poder ter codigo de saida
   proprio (97), lido pelo `scripts/rejeitado.mjs`. */
class NaoPodeMedir extends Error {}

/* ── as provas ─────────────────────────────────────────────────────────────
 * Cada uma devolve `null` quando o defeito NAO esta la, ou a frase do defeito.
 * `veneno` refaz o defeito para o controle negativo. */

const PROVAS = {
  'r44': {
    erik: 'o cartao "Relatorio de pesquisa" renderiza a capa de "Malha Urbana"',
    /* O VENENO E O PROPRIO SINTOMA: dois cartoes passam a mostrar a mesma
       imagem. Ele reproduz o que o Erik fotografou, e nao uma aproximacao. */
    veneno: `const capas = document.querySelectorAll('.livro img.capa');
             if (capas.length > 1) capas[1].setAttribute('src', capas[0].getAttribute('src'));`,
    async correr(veneno) {
      const d = medir('/estante', `
        const cartoes = [...document.querySelectorAll('.livro')].map(l => ({
          titulo: (l.querySelector('h3') || { textContent: '' }).textContent.trim(),
          src: l.querySelector('img.capa') ? l.querySelector('img.capa').getAttribute('src') : null }));
        const resumo = async (u) => {
          const b = await fetch(u, { credentials: 'include' }).then(r => r.arrayBuffer());
          const h = await crypto.subtle.digest('SHA-256', b);
          return [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
        };
        const vistos = {};
        for (const c of cartoes) { if (!c.src) continue; c.resumo = await resumo(c.src); (vistos[c.resumo] ??= []).push(c.titulo); }
        return { cartoes, repetidas: Object.entries(vistos).filter(([, t]) => t.length > 1).map(([r, t]) => ({ resumo: r, titulos: t })) };`, veneno);
      /* LIVRO SEM CAPA E ESTADO LEGITIMO, e deixou de ser defeito quando a
         `CapaDeReserva` entrou (R-47): sem arquivo, o emissor devolve `null` e
         a tela desenha o gabarito com o titulo. O acervo semeado tem um assim
         de proposito.
         O QUE CONTINUA SENDO DEFEITO E NINGUEM TER CAPA. Foi o que aconteceu
         em 04/09, quando a capa passou a morar em `storage/covers` e o
         semeador continuou escrevendo so em `storage/temp`: os seis cartoes
         caIram no gabarito de uma vez, e sem esta linha a prova teria passado
         verde numa bancada que nao mostrava capa nenhuma. */
      const comCapa = d.cartoes.filter((c) => c.src);
      if (!comCapa.length) return 'nenhum livro da estante tem capa — a bancada nao esta servindo capa';
      if (d.repetidas.length) {
        const par = d.repetidas[0];
        return `dois livros com a MESMA imagem de capa: ${par.titulos.join(' e ')}`;
      }
      return null;
    },
  },
  'r02': {
    erik: 'o click so funciona na div inferior a da capa, usuarios tendem a clicar na capa',
    /* O VENENO DESFAZ O CONSERTO, e nao imita o sintoma de longe: devolve
       `pointer-events: auto` a capa, que e exatamente o estado em que ela
       ficava por cima do alvo e comia o clique. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.capa { pointer-events: auto; }';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const ficha = () => {
          const h = document.querySelector('.ficha-caixa header h2');
          return h ? h.textContent.trim() : null;
        };
        const antes = ficha();
        const cartoes = [...document.querySelectorAll('.livro')];
        const alvo = cartoes.find(l => !l.classList.contains('escolhido')) || cartoes[0];
        if (!alvo) return { vazio: true };
        const capa = alvo.querySelector('.capa');
        const r = capa.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
        /* ELEMENTFROMPOINT E O MESMO TESTE QUE O NAVEGADOR FAZ para decidir
           quem recebe o clique. Medido nos dois sentidos com ponteiro de
           verdade pelo CDP: limpa ele devolve o botao e a ficha troca;
           envenenada devolve a imagem e a ficha nao troca. */
        const no = document.elementFromPoint(x, y);
        const recebe = no ? (no.tagName.toLowerCase() + (no.className ? '.' + String(no.className).trim().split(/\s+/).join('.') : '')) : null;
        const dentroDoAlvo = !!(no && no.closest('.livro-alvo'));
        if (no) no.click();
        await new Promise(r2 => setTimeout(r2, 500));
        return { antes, depois: ficha(), titulo: (alvo.querySelector('h3') || { textContent: '' }).textContent.trim(), recebe, dentroDoAlvo };`, veneno);
      if (d.vazio) return 'a estante nao tem cartao para clicar — semeie antes';
      if (!d.dentroDoAlvo) return `o centro da capa nao chega ao alvo do clique: quem recebe e ${d.recebe}`;
      if (d.depois !== d.titulo) return `clicar no centro da capa nao trocou a ficha: ela continua em ${d.depois}`;
      return null;
    },
  },
  'r46': {
    erik: 'limitar o titulo na estante, senao texto enorme quebra o layout',
    /* O VENENO TIRA O CORTE, e nao encurta o titulo: o titulo longo e a
       CONDICAO da medida, e por isso ele entra na propria medida. Prova que so
       ve nome curto nao sabe dizer nada sobre nome comprido. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.livro-texto h3 { -webkit-line-clamp: none; display: block; overflow: visible; }';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const cartoes = [...document.querySelectorAll('.livro')];
        if (!cartoes.length) return { vazio: true };
        const h = cartoes[0].querySelector('.livro-texto h3');
        const antes = h.getBoundingClientRect().height;
        const alturaAntes = cartoes[0].getBoundingClientRect().height;
        const inteiro = 'Um nome de arquivo desses que vem de exportador automatico e nao acaba nunca, com data e versao no fim 2026-09-04 v3';
        h.textContent = inteiro;
        h.setAttribute('title', inteiro);
        await new Promise(r2 => setTimeout(r2, 400));
        /* O CORTE SE MEDE PELO QUANTO A CAIXA CRESCEU, e nao contando linhas.
           Duas tentativas antes desta responderam errado, e as duas pelo mesmo
           motivo — instrumento que le altura absoluta:
             · Range.getClientRects() devolve uma caixa por linha DIAGRAMADA, e
               o -webkit-line-clamp esconde as linhas de baixo sem tira-las do
               fluxo: 7 linhas no limpo e 7 no envenenado, com a tela cortando
               em 2 nos dois casos.
             · dividir altura por entrelinha erra porque o text-box-trim:
               trim-both do estilo/base.css tira ~15px por linha do que a caixa
               mede — clientHeight 17 onde a linha pede 32 (R-27).
           A diferenca da MESMA caixa antes e depois nao carrega nenhum dos
           dois: o corte, se existe, segura o crescimento; sem ele a caixa vai
           atras do texto. E a altura do CARTAO diz o que o Erik reclamou, que
           e a grade se desmanchando. */
        const linha = parseFloat(getComputedStyle(h).lineHeight) || 32;
        const cresceu = Math.round(h.getBoundingClientRect().height - antes);
        /* O CARTAO SE COMPARA CONSIGO MESMO, e nao com os outros.
           A primeira versao exigia UMA altura para todos os cartoes, e ela
           passava por sorte: com seis livros a grade fecha duas fileiras
           cheias, e fileira de grade estica todos os irmaos ate o mais alto.
           No dia em que a bancada ganhou um setimo trabalho — o parado em
           analyzed —, a ultima fileira ficou com um cartao sozinho, sem
           irmao para estica-lo: 472 e 439, e a prova acusou o corte do titulo
           por causa da aritmetica da grade. Medir o mesmo cartao antes e depois
           nao carrega a fileira. */
        const cresceuCartao = Math.round(cartoes[0].getBoundingClientRect().height - alturaAntes);
        return { cresceu, cresceuCartao, linha, guardaOInteiro: h.getAttribute('title') === inteiro };`, veneno);
      if (d.vazio) return 'a estante nao tem cartao para medir — semeie antes';
      if (d.cresceu > d.linha) return `o titulo longo esticou a caixa do nome em ${d.cresceu}px — mais de uma linha de ${d.linha}px, entao o corte em 2 nao segurou`;
      if (d.cresceuCartao > 0) return `o titulo longo esticou o proprio cartao em ${d.cresceuCartao}px — a grade se desmancha`;
      if (!d.guardaOInteiro) return 'o cartao corta o nome e nao guarda o inteiro no `title` — isso e esconder, nao resumir';
      return null;
    },
  },
  'r47': {
    erik: 'tem um component set no figma com varias capas justamente pro usuario nao ficar sem capa',
    /* O VENENO REFAZ O ESTADO ANTERIOR: no lugar do gabarito, a moldura
       quebrada que a estante mostrava quando `cover_url` vinha nao-nulo sem
       arquivo em disco. Era esse o defeito — o `.capa-vazia` existia no CSS e
       nunca era alcancado. */
    veneno: `document.querySelectorAll('.capa-de-reserva').forEach((e) => {
               const i = document.createElement('img');
               i.className = 'capa';
               i.setAttribute('src', '/storage/covers/nao-existe-de-proposito/capa.png');
               e.replaceWith(i);
             });`,
    async correr(veneno) {
      const d = medir('/estante', `
        await new Promise(r2 => setTimeout(r2, 600));
        const cartoes = [...document.querySelectorAll('.livro')].map(l => {
          const img = l.querySelector('img.capa');
          const res = l.querySelector('.capa-de-reserva');
          const alvo = res || img;
          const r = alvo ? alvo.getBoundingClientRect() : null;
          return {
            titulo: (l.querySelector('h3') || { textContent: '' }).textContent.trim(),
            reserva: !!res,
            quebrada: !!(img && img.complete && img.naturalWidth === 0),
            variante: res ? res.getAttribute('data-capa') : null,
            /* O TITULO SE LE DO GABARITO INTEIRO, e nao de uma classe filha.
               A primeira versao mirava .capa-de-reserva-titulo, e a peca foi
               reorganizada do outro lado — .cr-titulo, com .cr-arte e .cr-alto
               em volta. A prova ficou vermelha por um RENOME, dizendo
               "regrediu" sobre uma tela que estava certa. O item cobra que o
               titulo esteja DENTRO do gabarito; onde ele mora la dentro e
               desenho, e desenho muda. */
            dentro: res ? (res.textContent || '').trim() : null,
            largura: r ? Math.round(r.width) : 0,
            razao: r && r.height ? +(r.width / r.height).toFixed(3) : 0,
          };
        });
        return { cartoes };`, veneno);
      const quebradas = d.cartoes.filter((c) => c.quebrada).map((c) => c.titulo);
      if (quebradas.length) return `capa quebrada na estante, e nao o gabarito: ${quebradas.join(', ')}`;
      const reservas = d.cartoes.filter((c) => c.reserva);
      if (!reservas.length) return 'nenhum livro caiu no gabarito — semeie um sem capa, senao a medida nao ve o estado que ela mede';
      for (const r of reservas) {
        if (!r.dentro || !r.dentro.includes(r.titulo)) return `o gabarito de "${r.titulo}" nao traz o titulo dentro (leu "${r.dentro}")`;
        if (!r.variante) return `o gabarito de "${r.titulo}" saiu sem variante — o mesmo livro mudaria de capa a cada visita`;
        /* 420/594 = 0,7071. O gabarito ocupa a MESMA caixa da capa de verdade,
           senao a grade dança conforme quantos livros tem capa. */
        if (Math.abs(r.razao - 0.707) > 0.01) return `o gabarito de "${r.titulo}" saiu com razao ${r.razao}, e a capa e 420/594 (0,707)`;
      }
      const larguras = [...new Set(d.cartoes.map((c) => c.largura))];
      if (larguras.length > 1) return `gabarito e capa ocupam larguras diferentes: ${larguras.join('px, ')}px`;
      return null;
    },
  },
  'r54': {
    erik: '(nao e dele — irmao do R-53: uma conversao em curso nao voltava para a tela de espera)',
    /* O VENENO REFAZ A ORDEM ANTIGA: esconder a tela de andamento devolve a
       PROPOSTA no lugar dela, que e exatamente o que a pessoa via ao reabrir
       `/preparo/:id` com o servidor ja convertendo aquele arquivo — com
       "Preparar com recomendacoes" clicavel, e podendo mandar converter de novo
       o que ja estava sendo convertido. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.preparo-andando{display:none !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/preparo/{CONVERTENDO}', `
        await new Promise(r2 => setTimeout(r2, 900));
        const espera = document.querySelector('.preparo-andando');
        const cabeca = document.querySelector('.preparo-andando-card h2');
        return {
          temEspera: !!espera && espera.getBoundingClientRect().height > 0,
          etapa: cabeca ? cabeca.textContent.trim() : null,
          /* CONTROLE: sem a pagina montada, "sem tela de espera" e cegueira. */
          temPagina: !!document.querySelector('.preparo-pagina'),
          /* O BOTAO QUE NAO PODE ESTAR CLICAVEL: mandar converter de novo o que
             ja esta convertendo e o custo do defeito, e nao um detalhe. */
          convidaDeNovo: [...document.querySelectorAll('button')]
            .some(b => /Preparar com recomenda/.test(b.textContent || '') && !b.disabled),
        };`, veneno);
      if (!d.temPagina) {
        throw new NaoPodeMedir('a pagina de preparo nao montou — nao da para dizer em que tela ela abriu');
      }
      if (!d.temEspera) return 'uma conversao em curso nao abre na tela de espera: ela volta para a proposta';
      if (d.convidaDeNovo) return 'a tela de espera abriu, mas "Preparar com recomendacoes" continua clicavel por cima de uma conversao em curso';
      if (!d.etapa || !/Preparando/.test(d.etapa)) return `a tela de espera abriu sem dizer a etapa (leu "${d.etapa}")`;
      return null;
    },
  },

  'r20': {
    erik: '"Div central com 2 larguras sem necessidade" (/estudos)',
    /* O VENENO ACRESCENTA UMA TERCEIRA largura ao corpo — 1100 numa faixa que
       deveria medir 1222 —, que e o defeito que o item descreve: bloco de
       largura propria sem motivo estrutural. As duas larguras que ficam tem
       motivo, e o veneno nao as toca. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.estudos-metade{inline-size:1100px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estudos', `
        const faixas = [...document.querySelectorAll('.estudos > *, .estudos-de-baixo > *')]
          .filter(e => e.getBoundingClientRect().height > 24 && !e.className.includes('fileira-vistas'))
          .map(e => Math.round(e.getBoundingClientRect().width));
        return { temTela: faixas.length > 3, larguras: [...new Set(faixas)].sort((a, b) => a - b) };`, veneno);
      if (!d.temTela) throw new NaoPodeMedir('a tela de estudos nao mostrou faixas bastante');
      /* DUAS, E SO DUAS: 1222 acima da trilha e 974 ao lado dela. Ambas do no
         `900:56142`, que so poe a trilha ao lado da parte de baixo. */
      const esperadas = [974, 1222];
      const iguais = d.larguras.length === 2 && d.larguras.every((v, i) => v === esperadas[i]);
      if (!iguais) return `as faixas medem ${d.larguras.join(', ')}, e o no da duas: 1222 acima da trilha e 974 ao lado dela`;
      return null;
    },
  },

  'r22': {
    erik: '"Nao seguiu o Figma — inventou coisa que nem devia existir" (detalhes do arquivo)',
    /* O VENENO DEVOLVE O RECHEIO DAS FOLHAS ESTREITAS a esta, que e a AMPLA:
       32 em volta contra os 40 e 56 que o `895:12217` pede para ela. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.folha.ampla .folha-topo{padding:32px !important}'
                           + '.folha.ampla .folha-conteudo{gap:48px !important;padding:0 32px 32px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante/{LIVRO}', `
        const esperar2 = ms => new Promise(r3 => setTimeout(r3, ms));
        const b = [...document.querySelectorAll('button')]
          .find(e => /Configura/.test(e.getAttribute('aria-label') || ''));
        if (!b) return { temBotao: false };
        b.click();
        await esperar2(700);
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const folha = document.querySelector('.folha.ampla');
        const linha = document.querySelector('.arquivo-linha');
        return {
          temBotao: true,
          temFolha: !!folha,
          larg: folha ? Math.round(folha.getBoundingClientRect().width) : 0,
          topo: px(document.querySelector('.folha.ampla .folha-topo'), 'paddingTop'),
          corpo: px(document.querySelector('.folha.ampla .folha-conteudo'), 'rowGap'),
          linhaRecheio: px(linha, 'paddingTop'),
          linhas: document.querySelectorAll('.arquivo-linha').length,
        };`, veneno);
      if (!d.temBotao) throw new NaoPodeMedir('a ficha do livro nao tem o botao de configuracoes');
      if (!d.temFolha) throw new NaoPodeMedir('a folha de configuracoes nao abriu');
      if (d.larg !== 1082) return `a folha mede ${d.larg}, e o 941:23118 pede 1082`;
      if (d.topo !== 40) return `o cabecalho da folha ampla tem ${d.topo} de recheio, e o 895:12217 pede 40`;
      if (d.corpo !== 56) return `o corpo da folha ampla tem ${d.corpo} entre blocos, e o no pede 56`;
      if (d.linhaRecheio !== 40) return `a linha tem ${d.linhaRecheio} de recheio, e o no pede 40`;
      if (d.linhas !== 5) return `a folha tem ${d.linhas} linhas, e o no desenha cinco`;
      return null;
    },
  },

  'r35': {
    erik: '"Continua completamente bugada" (estante 3D)',
    /* A VISTA 3D MORA EM `/estante`, e nao em `/estante/:id` — aquela e a
       ficha do livro. Apontei para a errada na primeira escrita e a prova
       respondeu "a vista 3D nao montou a pilha", que era verdade sobre a
       outra tela. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.ficha-caixa{padding:24px !important;gap:16px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const esperar2 = ms => new Promise(r3 => setTimeout(r3, ms));
        const b = [...document.querySelectorAll('.recortes.vista button')]
          .find(e => /3D/.test(e.textContent || ''));
        if (b) { b.click(); await esperar2(700); }
        const pilha = document.querySelector('.pilha');
        const ficha = document.querySelector('.ficha');
        const caixa = document.querySelector('.ficha-caixa');
        return {
          temPilha: !!pilha,
          deitados: document.querySelectorAll('.livro-deitado').length,
          fichaLarg: ficha ? Math.round(ficha.getBoundingClientRect().width) : 0,
          caixaRecheio: px(caixa, 'paddingTop'),
          caixaVao: px(caixa, 'rowGap'),
          titulo: px(caixa ? caixa.querySelector('h2') : null, 'fontSize'),
        };`, veneno);
      if (!d.temPilha) throw new NaoPodeMedir('a vista 3D nao montou a pilha');
      if (d.deitados < 2) return `a pilha tem ${d.deitados} livro(s) deitado(s)`;
      if (d.fichaLarg !== 476) return `a ficha mede ${d.fichaLarg}, e o 895:7506 pede 476`;
      if (d.caixaRecheio !== 40) return `o cartao da ficha tem ${d.caixaRecheio} de recheio, e o 917:8399 pede 40`;
      if (d.caixaVao !== 32) return `o cartao da ficha tem ${d.caixaVao} de vao, e o no pede 32`;
      if (d.titulo !== 32) return `o titulo da ficha esta em ${d.titulo}, e o no pede heading-md 32`;
      return null;
    },
  },

  'r19': {
    erik: '"Figma totalmente ignorado" (/estudos)',
    /* O VENENO DEVOLVE A ESCALA E A ORDEM ANTIGAS: titulo em 32/40 e o cartao
       do que ficou pela metade colado no cabecalho, antes dos recortes. Era
       assim que a tela estava quando ele escreveu a frase. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.estudos h1{font-size:32px !important;line-height:40px !important}'
                           + '.estudos-metade{order:-1}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estudos', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const h1 = document.querySelector('.estudos h1');
        const sobre = document.querySelector('.estudos-sobre');
        const filhos = [...document.querySelectorAll('.estudos > *')].map(e => e.className);
        return {
          temTela: !!h1,
          titulo: px(h1, 'fontSize') + '/' + px(h1, 'lineHeight'),
          frase: px(sobre, 'fontSize') + '/' + px(sobre, 'lineHeight'),
          respiro: px(document.querySelector('.estudos'), 'rowGap'),
          recortesAntes: filhos.indexOf('estudos-fileira') < filhos.indexOf('estudos-metade'),
        };`, veneno);
      if (!d.temTela) throw new NaoPodeMedir('a tela de estudos nao montou');
      if (d.titulo !== '48/56') return `o titulo esta em ${d.titulo}, e o 900:56142 pede heading-xl 48/56`;
      if (d.frase !== '20/30') return `a frase de abertura esta em ${d.frase}, e o no pede body-medium 20/30`;
      if (d.respiro !== 128) return `o respiro entre faixas e ${d.respiro}, e o no pede 128`;
      if (!d.recortesAntes) return 'o cartao do que ficou pela metade vem ANTES dos recortes; os dois nos poem os recortes primeiro';
      return null;
    },
  },

  'r33': {
    erik: '"Espacamento bugado, nao segue o grid do Figma, navegacao errada" (por onde comecar)',
    veneno: `const s = document.createElement('style');
             s.textContent = '.ajuda-tarefas li{padding:32px !important;gap:12px !important}'
                           + '.ajuda-numero{font-size:40px !important;line-height:48px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/ajuda', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const li = document.querySelector('.ajuda-tarefas li');
        const n = document.querySelector('.ajuda-numero');
        return {
          temTela: !!li,
          recheio: px(li, 'paddingTop'),
          vao: px(li, 'rowGap'),
          algarismo: px(n, 'fontSize') + '/' + px(n, 'lineHeight'),
          italico: n ? getComputedStyle(n).fontStyle : null,
          titulo: px(li ? li.querySelector('h2') : null, 'fontSize'),
        };`, veneno);
      if (!d.temTela) throw new NaoPodeMedir('a tela de ajuda nao mostrou cartao de tarefa');
      if (d.recheio !== 40) return `o cartao tem ${d.recheio} de recheio, e o 895:11255 pede 40`;
      if (d.vao !== 40) return `o cartao tem ${d.vao} de vao, e o no pede 40`;
      if (d.algarismo !== '64/72') return `o algarismo esta em ${d.algarismo}, e o no pede display-large-capitular 64/72`;
      if (d.italico !== 'italic') return 'o algarismo nao esta em italico, e o capitular do no e italico';
      if (d.titulo !== 28) return `o titulo do cartao esta em ${d.titulo}, e o no pede Heading/SM 28`;
      return null;
    },
  },

  'r34': {
    erik: '"Bem errada tambem, nao condizendo com o Figma" (/preparo/:id)',
    veneno: `const s = document.createElement('style');
             s.textContent = '.marca-arquivo{padding:4px 12px !important;line-height:20px !important}'
                           + '.preparo-pagina-lista li{padding:24px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/preparo/{ANALISADO}', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const marca = document.querySelector('.marca-arquivo');
        const li = document.querySelector('.preparo-pagina-lista li');
        const h1 = document.querySelector('.preparo-pagina h1');
        const h2 = document.querySelector('.preparo-pagina-secao h2');
        return {
          temTela: !!li,
          pilula: px(marca, 'paddingTop') + '/' + px(marca, 'paddingLeft') + ' ' + px(marca, 'lineHeight'),
          cartao: px(li, 'paddingTop'),
          titulo: px(h1, 'fontSize') + '/' + px(h1, 'lineHeight'),
          secao: px(h2, 'fontSize') + '/' + px(h2, 'lineHeight'),
        };`, veneno);
      if (!d.temTela) throw new NaoPodeMedir('a tela de preparo nao mostrou a lista de achados');
      if (d.pilula !== '13/17 22') return `a marca do arquivo esta em ${d.pilula}, e o 966:31521 pede 13 por 17 com Label/Small 14/22`;
      if (d.cartao !== 40) return `o cartao de achado tem ${d.cartao} de recheio, e o 895:7946 pede 40`;
      if (d.titulo !== '40/48') return `o titulo esta em ${d.titulo}, e o no pede 40/48`;
      if (d.secao !== '32/40') return `o titulo de secao esta em ${d.secao}, e o no pede heading-md 32/40`;
      return null;
    },
  },

  'r11': {
    erik: '"O espacamento entre itens esta errado" · "espacamento na estante incoerente com o figma"',
    /* O VENENO TROCA OS VAOS por numeros redondos que parecem certos e nao sao:
       32 em volta na grade, 16 dentro do item. E o tipo de valor que entra
       quando alguem arredonda a olho em vez de ler o no. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.grade{gap:32px !important}.livro{gap:16px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : -1;
        const g = document.querySelector('.grade');
        const li = document.querySelector('.grade .livro');
        return {
          temGrade: !!g && g.children.length > 1,
          linha: px(g, 'rowGap'),
          coluna: px(g, 'columnGap'),
          item: px(li, 'rowGap'),
          texto: px(li ? li.querySelector('.livro-texto') : null, 'rowGap'),
        };`, veneno);
      if (!d.temGrade) throw new NaoPodeMedir('a estante nao mostrou grade com mais de um livro');
      if (d.linha !== 64 || d.coluna !== 48) return `a grade tem vao ${d.linha}/${d.coluna}, e o no 895:7382 e 895:7383 pedem 64 entre linhas e 48 entre colunas`;
      if (d.item !== 24) return `o item tem ${d.item} entre a capa e o texto, e o no 895:7384 pede 24`;
      if (d.texto !== 16) return `o texto do item tem ${d.texto} entre titulo e autor, e o no 895:7390 pede 16`;
      return null;
    },
  },

  'r24': {
    erik: '"Menu errado: itens abrem do lado contrario ao do icone; dropdowns e modais abrem errado, com largura errada, icones apertados"',
    /* O VENENO REFAZ AS DUAS LARGURAS SOLTAS: o caderno em 380 e a aparencia em
       384, enquanto os tres irmaos ficavam em 464. Cinco paineis abertos pelo
       mesmo tipo de botao da mesma barra, com tres larguras. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.aparencia{inline-size:384px !important}.caderno{inline-size:380px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/leitura/{LIVRO}', `
        const esperar2 = ms => new Promise(r3 => setTimeout(r3, ms));
        const clicar = async (rotulo) => {
          const b = [...document.querySelectorAll('button')]
            .find(e => (e.getAttribute('aria-label') || '').startsWith(rotulo));
          if (!b) return null;
          b.click();
          await esperar2(500);
          const p = document.querySelector('.indice, .caderno, .aparencia');
          if (!p) return null;
          const r = p.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const fora = { larg: Math.round(r.width),
                         ladoDoPainel: r.x < innerWidth / 2 ? 'esquerda' : 'direita',
                         ladoDoBotao: rb.x < innerWidth / 2 ? 'esquerda' : 'direita' };
          const x = [...document.querySelectorAll('button')]
            .find(e => /Fechar/i.test(e.getAttribute('aria-label') || ''));
          if (x) { x.click(); await esperar2(400); }
          return fora;
        };
        const fora = {};
        for (const nome of ['Indice do livro', 'Notas', 'Aparencia da leitura']) fora[nome] = null;
        fora.indice = await clicar('Índice do livro');
        fora.notas = await clicar('Notas');
        fora.aparencia = await clicar('Aparência da leitura');
        return fora;`, veneno);
      const nomes = ['indice', 'notas', 'aparencia'];
      if (nomes.some((n) => !d[n])) {
        throw new NaoPodeMedir('nao consegui abrir os tres paineis da leitura');
      }
      for (const n of nomes) {
        if (d[n].ladoDoPainel !== d[n].ladoDoBotao) {
          return `o painel "${n}" abre a ${d[n].ladoDoPainel} e o botao dele esta a ${d[n].ladoDoBotao}`;
        }
        if (d[n].larg !== 464) {
          return `o painel "${n}" mede ${d[n].larg}, e o no 941:23110 poe os paineis do leitor em 464`;
        }
      }
      return null;
    },
  },

  'r29': {
    erik: '"Ha imagens ilustrativas nas secoes, cuidadosamente posicionadas para ficar em cima do container ... e ainda assim voce fez errado"',
    /* O VENENO ESCONDE O DESENHO, que e o estado de 04/09: a tela nao tinha
       imagem nenhuma maior que 24px porque o SVG exportado era o no ERRADO — um
       bloco de texto branco — e tinha sido apagado. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.conta-desenho{display:none !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/conta/privacidade', `
        const im = document.querySelector('.conta-desenho');
        const painel = document.querySelector('.conta-painel');
        const r = im ? im.getBoundingClientRect() : null;
        const p = painel ? painel.getBoundingClientRect() : null;
        return {
          temPainel: !!painel,
          alto: r ? Math.round(r.height) : 0,
          largo: r ? Math.round(r.width) : 0,
          /* EM CIMA DO CONTAINER, que e a metade da frase do Erik que uma
             imagem presente mas empilhada nao cumpre: a base do desenho cai
             DENTRO do card, e nao acima dele. */
          entra: r && p ? Math.round(r.bottom - p.top) : null,
        };`, veneno);
      if (!d.temPainel) throw new NaoPodeMedir('a tela de privacidade nao montou');
      if (d.alto <= 24) return `a secao nao tem desenho nenhum maior que 24px (mediu ${d.alto})`;
      if (!(d.entra > 0)) return `o desenho existe mas nao encosta no card: a base dele fica ${-d.entra}px acima do topo`;
      return null;
    },
  },

  'r40': {
    erik: '"falta os desenhos das configuracoes"',
    veneno: `const s = document.createElement('style');
             s.textContent = '.conta-desenho{display:none !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/conta/preferencias', `
        const im = document.querySelector('.conta-desenho');
        const r = im ? im.getBoundingClientRect() : null;
        return {
          temPainel: !!document.querySelector('.conta-painel'),
          alto: r ? Math.round(r.height) : 0,
          arquivo: im ? (im.getAttribute('src') || '') : null,
        };`, veneno);
      if (!d.temPainel) throw new NaoPodeMedir('a tela de preferencias nao montou');
      if (d.alto <= 24) return `a tela de configuracoes nao tem desenho (mediu ${d.alto}px de altura)`;
      /* O DESENHO E O DELA, e nao o de outra tela: quatro telas de conta, quatro
         desenhos. Um so, repetido, e o defeito voltando de outro jeito. */
      if (!/preferencias/.test(d.arquivo || '')) return `a tela de configuracoes usa o desenho de outra tela (${d.arquivo})`;
      return null;
    },
  },

  'r32': {
    erik: '"Tela de privacidade completamente quebrada" · "Na tela de dados de uso voce modificou tudo — se nao havia outra forma, siga o Figma"',
    /* O VENENO DEVOLVE A ESCALA ANTIGA: 16/24 no item e 14/20 na explicacao,
       que e o que a tela tinha antes de ser conferida contra o no. Nao e
       "quebrada" no sentido de layout partido — os dois nos escrevem
       body-medium 20/30 e body-small 16/24, e o produto escrevia um passo
       abaixo nos dois, nas duas larguras. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.guardado-conta{font-size:16px !important;line-height:24px !important}'
                           + '.guardado-explicacao{font-size:14px !important;line-height:20px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/conta/privacidade', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : 0;
        const item = document.querySelector('.guardado-conta');
        const sobre = document.querySelector('.guardado-explicacao');
        const h2 = document.querySelector('.conta-secao h2');
        return {
          temPainel: !!document.querySelector('.conta-painel'),
          secoes: document.querySelectorAll('.conta-secao').length,
          item: px(item, 'fontSize') + '/' + px(item, 'lineHeight'),
          sobre: px(sobre, 'fontSize') + '/' + px(sobre, 'lineHeight'),
          titulo: px(h2, 'fontSize') + '/' + px(h2, 'lineHeight'),
        };`, veneno);
      if (!d.temPainel) throw new NaoPodeMedir('a tela de privacidade nao montou');
      if (d.secoes < 3) return `a tela abriu com ${d.secoes} secao(oes) — o no 895:10909 tem tres alem das do produto`;
      if (d.item !== '20/30') return `o item da lista esta em ${d.item}, e os dois nos escrevem Body/Medium 20/30`;
      if (d.sobre !== '16/24') return `a explicacao esta em ${d.sobre}, e os dois nos escrevem Body/Small 16/24`;
      if (d.titulo !== '28/36') return `o titulo de secao esta em ${d.titulo}, e o no escreve Heading/SM 28/36`;
      return null;
    },
  },

  'r39': {
    erik: '"padding bugado" (nas secoes)',
    /* O VENENO REFAZ O RECHEIO ANTIGO do card da conta no telefone: 40 em cima,
       24 dos lados, 80 embaixo — numeros meus, nao do no. Com eles a coluna
       media 310 numa tela de 390; o `966:25321` pede 326. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.conta{padding:40px 24px 80px !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/conta', `
        const px = (e, p) => e ? Math.round(parseFloat(getComputedStyle(e)[p])) : 0;
        const conta = document.querySelector('.conta');
        const painel = document.querySelector('.conta-painel');
        return {
          temPainel: !!painel,
          cima: px(conta, 'paddingTop'),
          lado: px(conta, 'paddingLeft'),
          baixo: px(conta, 'paddingBottom'),
          coluna: painel ? Math.round(painel.getBoundingClientRect().width) : 0,
        };`, veneno, { largura: 390, altura: 844 });
      if (!d.temPainel) throw new NaoPodeMedir('a tela de conta nao montou');
      const tem = `${d.cima}/${d.lado}/${d.baixo}`;
      if (tem !== '56/16/64') return `o card da conta no telefone esta com ${tem}, e o no 966:25321 pede 56/16/64`;
      if (d.coluna !== 326) return `a coluna mede ${d.coluna} no telefone, e o no pede 326`;
      return null;
    },
  },

  'r01': {
    erik: '"Hover nos livros e muito feio e nao da o devido destaque, pode passar facilmente despercebido"',
    /* O VENENO REFAZ O VEU: 4% de tinta no alvo, que pinta POR CIMA da capa, e
       nada de levantar. E o que a tela tinha nas tres vezes em que ele
       reclamou — pouco para ver e demais para a arte. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.livro:hover .capa-caixa{transform:none !important}'
                           + '.livro:hover .capa{border-color:transparent !important;box-shadow:none !important}'
                           + '.livro-alvo:hover{background:color-mix(in srgb, var(--foreground) 4%, transparent)}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/estante', `
        const li = [...document.querySelectorAll('.grade .livro')].find(e => !e.classList.contains('escolhido'));
        if (!li) return { temGrade: false };
        const capa = li.querySelector('.capa');
        const caixa = li.querySelector('.capa-caixa');
        const cs = getComputedStyle(capa);
        const m = getComputedStyle(caixa).transform;
        /* A ALTURA DO SALTO sai da matriz: translateY e o sexto numero. */
        const sobe = m && m !== 'none' ? Math.abs(parseFloat(m.split(',')[5])) : 0;
        return {
          temGrade: true,
          sobe,
          /* SEM REGEX AQUI, e o motivo esta no cabecalho deste arquivo: barra
             invertida dentro do literal de template e comida, e a expressao
             fica com parentese solto. O arquivo inteiro deixa de rodar e o erro
             chega como "nao consegui medir". Cai nela duas vezes seguidas. */
          temBorda: cs.borderTopColor !== 'rgba(0, 0, 0, 0)' && !cs.borderTopColor.endsWith(', 0'.concat(String.fromCharCode(41))),
          temSombra: cs.boxShadow !== 'none',
          /* CONTROLE DE DIRECAO: o alvo NAO pode pintar fundo por cima da arte. */
          veu: getComputedStyle(li.querySelector('.livro-alvo')).backgroundColor,
        };`, veneno, { mouse: '.grade .livro:not(.escolhido) .capa' });
      if (!d.temGrade) throw new NaoPodeMedir('a estante nao mostrou grade de livros');
      if (!(d.sobe >= 3)) return `o livro sob o ponteiro nao levanta (subiu ${d.sobe}px)`;
      if (!d.temBorda) return 'o livro sob o ponteiro nao ganha borda';
      if (!d.temSombra) return 'o livro sob o ponteiro nao ganha sombra';
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(d.veu)) return `o alvo pinta um veu (${d.veu}) por cima da arte da capa`;
      return null;
    },
  },

  'r53': {
    erik: '(nao e dele — a tela de Preparo pronta era inalcancavel por navegacao)',
    /* O VENENO REFAZ O ESTADO ANTERIOR: a tela de pronto some e a de analise
       volta no lugar dela, que e exatamente o que a pessoa via ao reabrir
       `/preparo/:id` de um trabalho ja convertido. */
    veneno: `const s = document.createElement('style');
             s.textContent = '.preparo-fim{display:none !important}';
             document.head.appendChild(s);`,
    async correr(veneno) {
      const d = medir('/preparo/{LIVRO}', `
        await new Promise(r2 => setTimeout(r2, 900));
        const fim = document.querySelector('.preparo-fim');
        const arquivo = document.querySelector('.preparo-fim-arquivo');
        return {
          temFim: !!fim && fim.getBoundingClientRect().height > 0,
          titulo: fim ? (fim.querySelector('h1') || { textContent: '' }).textContent.trim() : null,
          /* O NOME DO ARQUIVO E PARTE DO ITEM, e nao enfeite: ele lia
             epub_path, que o servidor nunca manda, e teria vindo vazio mesmo
             depois de a tela ficar alcancavel. Sem crase neste comentario: ele
             mora dentro de um literal de template. */
          arquivo: arquivo ? arquivo.textContent.trim() : null,
          /* CONTROLE: sem a pagina montada, "sem tela de pronto" e cegueira. */
          temPagina: !!document.querySelector('.preparo-pagina'),
          temProposta: !!document.querySelector('.preparo-pagina-lista'),
        };`, veneno);
      if (!d.temPagina) {
        throw new NaoPodeMedir('a pagina de preparo nao montou — nao da para dizer em que tela ela abriu');
      }
      if (!d.temFim) return 'um trabalho ja convertido nao abre na tela de pronto: ele volta para a proposta';
      if (!d.titulo || !/na estante/.test(d.titulo)) return `a tela de pronto abriu sem a frase do no 895:8164 (leu "${d.titulo}")`;
      if (!d.arquivo || !/\.epub/i.test(d.arquivo)) return `a tela de pronto nao traz o nome do EPUB (leu "${d.arquivo}") — o campo do servidor e epub_url, e nao epub_path`;
      return null;
    },
  },
  'r52': {
    erik: 'canvas n vai existir no telefone, ja falamos sobre isso',
    /* O VENENO REFAZ O QUE FOI MEDIDO EM 04/09: a 390 o Canvas renderizava
       inteiro e aparecia na barra de lugares como qualquer outro. Ele devolve
       as duas metades do defeito — o item oferecido e a tela servida — porque
       consertar so uma deixaria a outra passar. */
    veneno: `const barra = document.querySelector('nav[aria-label="Lugares do Mekora"]');
             if (barra) { const a = document.createElement('a'); a.setAttribute('href', '/canvas');
                          a.textContent = 'Canvas'; barra.appendChild(a); }
             const exp = document.querySelector('section.ainda-nao');
             if (exp) { const c = document.createElement('section'); c.className = 'canvas'; exp.replaceWith(c); }`,
    async correr(veneno) {
      const olhar = `
        document.querySelector('.cabecalho-menu') && document.querySelector('.cabecalho-menu').click();
        await new Promise(r2 => setTimeout(r2, 500));
        const barra = document.querySelector('nav[aria-label="Lugares do Mekora"]');
        const naBarra = barra ? [...barra.querySelectorAll('a')].map(a => a.textContent.trim()) : [];
        const noMenu = [...document.querySelectorAll('.menu-grupo a')].map(a => a.textContent.trim());
        return {
          naBarra, noMenu,
          canvasNaBarra: naBarra.some(t => /canvas/i.test(t)),
          canvasNoMenu: noMenu.some(t => /canvas/i.test(t)),
          telaDoCanvas: !!document.querySelector('section.canvas'),
          telaDeExplicacao: !!document.querySelector('section.ainda-nao'),
          /* CONTROLE NEGATIVO: sem a Estante na barra, o seletor nao acha nada e
             "o Canvas nao esta la" nao e resposta, e cegueira. */
          estanteNaBarra: naBarra.some(t => /estante/i.test(t)),
        };`;

      const tel = medir('/canvas', olhar, veneno, { largura: 390, altura: 844 });
      if (!tel.estanteNaBarra) {
        throw new NaoPodeMedir('a 390 a medida nao achou nem a Estante na barra — o seletor esta errado, e nao o produto');
      }
      if (tel.canvasNaBarra) return `a 390 o Canvas continua na barra de lugares (${tel.naBarra.join(', ')})`;
      if (tel.canvasNoMenu) return 'a 390 o Canvas continua no menu do telefone';
      if (tel.telaDoCanvas) return 'a 390 a rota /canvas ainda serve o Canvas, e ele e de computador';
      if (!tel.telaDeExplicacao) return 'a 390 a rota /canvas nao serve nem o Canvas nem a explicacao — quem guardou o endereco cai no vazio';

      /* O OUTRO SENTIDO, e ele nao e zelo: sem esta metade eu fecho o item
         apagando o Canvas de todo tamanho de tela, e a prova aplaude. */
      const pc = medir('/canvas', olhar, '', { largura: 1920, altura: 1080 });
      if (!pc.estanteNaBarra) {
        throw new NaoPodeMedir('a 1920 a medida nao achou nem a Estante na barra — instrumento cego');
      }
      if (!pc.canvasNaBarra) return 'a 1920 o Canvas sumiu da barra de lugares — o conserto do telefone levou o computador junto';
      if (!pc.telaDoCanvas) return 'a 1920 a rota /canvas nao abre o Canvas';
      return null;
    },
  },
  'r45': {
    erik: 'capa que falta virava moldura quebrada, e a que existia morava na pasta que a limpeza apaga',
    /* DOIS VENENOS NUM SO, porque o item tem dois defeitos e um so nao o
       reproduz: a URL emitida sem conferir o arquivo (moldura quebrada) e a
       capa morando em storage/temp, que o cleanup_old_jobs apaga por idade. */
    veneno: `document.querySelectorAll('img.capa').forEach((i, n) => {
               i.setAttribute('src', n === 0
                 ? '/storage/covers/nao-existe-de-proposito/capa.png'
                 : i.getAttribute('src').replace('/storage/covers/', '/storage/temp/').replace('capa.png', 'page_0.png'));
             });`,
    async correr(veneno) {
      const d = medir('/estante', `
        await new Promise(r2 => setTimeout(r2, 700));
        return { capas: [...document.querySelectorAll('img.capa')].map(i => ({
          titulo: (i.closest('.livro') || document.body).querySelector('h3')
            ? i.closest('.livro').querySelector('h3').textContent.trim() : '(sem titulo)',
          src: i.getAttribute('src'),
          quebrada: i.complete && i.naturalWidth === 0,
        })) };`, veneno);
      if (!d.capas.length) return 'nenhuma capa na estante — a bancada nao esta servindo capa';
      const quebradas = d.capas.filter((c) => c.quebrada).map((c) => c.titulo);
      if (quebradas.length) return `capa emitida sem arquivo, e a moldura sai quebrada: ${quebradas.join(', ')}`;
      /* A CAPA NAO PODE MORAR NO QUE A LIMPEZA APAGA. O cleanup_old_jobs faz
         rmtree em storage/temp depois de retention_days, e a estante que a
         mostra e permanente: capa em temp e capa com prazo de validade. */
      const efemeras = d.capas.filter((c) => !c.src.startsWith('/storage/covers/')).map((c) => `${c.titulo} (${c.src})`);
      if (efemeras.length) return `capa fora de /storage/covers, na pasta que a limpeza por idade apaga: ${efemeras.join(', ')}`;
      return null;
    },
  },
  'r05': {
    erik: 'nao precisa do botao enviar ao Kindle na Estante — o usuario faz isso na tela do livro',
    /* O VENENO REPOE O BOTAO na ficha da Estante, que e o estado anterior. Ele
       nao mexe na tela do livro: a prova tem de reprovar por ele estar de volta
       na Estante, e nao por ter sumido do lugar certo. */
    veneno: `const ficha = document.querySelector('.ficha-caixa');
             if (ficha) {
               const b = document.createElement('button');
               b.type = 'button';
               b.className = 'botao secundaria';
               b.textContent = 'Enviar ao Kindle';
               ficha.appendChild(b);
             }`,
    async correr(veneno) {
      const acha = `
        const gatilhos = [...document.querySelectorAll('button, a')]
          .filter(e => /enviar.{0,24}kindle/i.test((e.textContent || '').trim()))
          .map(e => (e.textContent || '').trim().slice(0, 60));
        return { gatilhos, temFicha: !!document.querySelector('.ficha-caixa') };`;
      const estante = medir('/estante', acha, veneno);
      if (!estante.temFicha) return 'a ficha do livro escolhido nao abriu — sem ela a medida nao ve o lugar de onde o botao saiu';
      if (estante.gatilhos.length) return `o envio ao Kindle continua na Estante: ${estante.gatilhos.join(' · ')}`;
      /* E ELE TEM DE ESTAR NA TELA DO LIVRO. Sem esta metade, apagar o botao
         das duas telas passaria — e aI o produto perdia a promessa que da nome
         a ele em vez de mudar de lugar. */
      const livro = medir('/estante/{LIVRO}', acha);
      if (!livro.gatilhos.length) return 'o envio ao Kindle sumiu tambem da tela do livro, que e onde o Erik disse que ele mora';
      return null;
    },
  },
  'r28': {
    erik: 'clico em adicionar cor e o texto da leitura nao muda de cor — botao que nao pressiona, nao muda, nao da feedback',
    /* O VENENO FAZ O BOTAO NAO FAZER NADA, que e o sintoma inteiro. Um ouvinte
       de CAPTURA no documento para o clique antes de ele chegar ao React, que
       escuta na raiz: a paleta continua na tela, a cor continua clicavel, e o
       clique morre no caminho. */
    veneno: `document.addEventListener('click', (e) => {
               if (e.target.closest && e.target.closest('.paleta-cor')) { e.stopPropagation(); e.preventDefault(); }
             }, true);`,
    async correr(veneno) {
      const d = medir('/leitura/{LIVRO}', `
        /* O 'esperar' JA VEM DO INVOLUCRO. Declarar de novo da
           "Identifier 'esperar' has already been declared", e o erro chega
           aqui como "nao consegui medir" — ambiente, quando e sintaxe. E o
           mesmo motivo pelo qual o veneno mora num bloco proprio. */
        await esperar(2000);
        /* O PARAGRAFO TEM DE ESTAR NA PROSA E RENDERIZADO. A primeira versao
           pegava o primeiro p longo da pagina, e ele era do formulario de
           recado, que esta na arvore e nao na tela: a selecao sobre conteudo
           nao renderizado sai VAZIA, e a medida dizia "a paleta nao abriu"
           quando o defeito era do instrumento. */
        const p = [...document.querySelectorAll('.prosa p')]
          .find(e => (e.textContent || '').trim().length > 80 && e.offsetParent !== null);
        if (!p) return { semParagrafo: true };
        const no = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 60);
        if (!no) return { semTexto: true };
        const faixa = document.createRange();
        faixa.setStart(no, 5); faixa.setEnd(no, 45);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(faixa);
        const trecho = sel.toString();
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await esperar(700);
        const paleta = document.querySelector('.paleta');
        const cores = paleta ? [...paleta.querySelectorAll('.paleta-cor')] : [];
        const antes = document.querySelectorAll('mark').length;
        if (cores.length) cores[0].click();
        /* QUATRO SEGUNDOS, E O NUMERO FOI MEDIDO. Marcar vai ao servidor e
           volta; com 1,6s a marca aparecia uma vez e nao aparecia na seguinte,
           com a MESMA tela. Prova intermitente e pior que prova ausente: ela
           ensina a ignorar o vermelho. Tres corridas seguidas a 4s: 1, 2 e 3
           marcas — crescendo, porque a nota fica gravada no livro. */
        await esperar(4000);
        const marcas = [...document.querySelectorAll('mark')].map(m => ({
          texto: m.textContent.trim(),
          fundo: getComputedStyle(m).backgroundColor,
        }));
        return { trecho, paletaAbriu: !!paleta, quantasCores: cores.length, antes, marcas };`, veneno);
      if (d.semParagrafo || d.semTexto) return 'a leitura nao abriu com texto — sem prosa nao da para marcar nada';
      if (!d.trecho) return 'a selecao saiu vazia: o trecho escolhido nao esta renderizado';
      if (!d.paletaAbriu) return 'soltar o botao sobre um trecho selecionado nao abriu a paleta';
      if (d.quantasCores < 4) return `a paleta abriu com ${d.quantasCores} cores, e o desenho tem 4`;
      if (d.marcas.length <= d.antes) return 'clicar na cor nao marcou nada: o texto da leitura continua sem cor';
      const nova = d.marcas.find((m) => d.trecho.includes(m.texto) || m.texto.includes(m.texto));
      /* PINTAR E O PONTO. Uma marca com fundo transparente seria a mesma queixa
         com outra forma — o elemento existe e a tela nao muda. */
      const semTinta = d.marcas.filter((m) => /transparent|rgba\(0, 0, 0, 0\)/.test(m.fundo));
      if (semTinta.length) return `a marca entrou sem tinta: fundo ${semTinta[0].fundo}`;
      if (!nova) return 'marcou, mas nao o trecho que estava selecionado';
      return null;
    },
  },
  'r50': {
    erik: '(nao e dele) a varredura passava por /preparo/:id, media a tela de espera e ficava VERDE',
    /* O VENENO REFAZ A BANCADA DE ANTES: a tela de espera no lugar do relatorio.
       Nao e um enfeite — e exatamente o que qualquer varredura "em todas as
       rotas" via ate 04/09, com a cobertura dizendo que a rota tinha sido
       visitada. Verde por omissao, com o instrumento certo e o dado errado. */
    veneno: `const alvo = document.querySelector('.preparo-pagina');
             if (alvo) {
               alvo.innerHTML = '';
               const h = document.createElement('h2');
               h.setAttribute('role', 'status');
               h.textContent = 'Analisando o arquivo…';
               alvo.appendChild(h);
             }`,
    async correr(veneno) {
      const d = medir('/preparo/{ANALISADO}', `
        await esperar(2200);
        const txt = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
        return {
          rota: location.pathname,
          veredito: txt('.preparo-pagina-veredito'),
          secoes: [...document.querySelectorAll('.preparo-pagina-secao h2')].map(e => e.textContent.trim()),
          esperando: [...document.querySelectorAll('h2[role="status"], h1')]
            .map(e => e.textContent.trim()).filter(s => /analisando|preparando/i.test(s)),
          achados: document.querySelectorAll('.preparo-pagina-lista li').length,
        };`, veneno);
      if (/\/preparo\/0$/.test(d.rota || '')) return 'a bancada nao tem trabalho parado em analyzed — o semeador precisa gravar um, senao esta rota mede a tela errada';
      if (d.esperando.length) return `a rota abriu na tela de ESPERA, e nao no relatorio: "${d.esperando[0]}"`;
      if (!d.secoes.includes('O que encontrei')) return `a secao "O que encontrei" nao esta na tela (achei: ${d.secoes.join(', ') || 'nenhuma'})`;
      if (!d.veredito) return 'a tela abriu sem o veredito — o paragrafo que diz o que foi decidido sem perguntar';
      if (!d.achados) return 'a lista de achados saiu vazia';
      return null;
    },
  },
  'r03': {
    erik: 'o marcador vaza da capa e invade o filtro',
    veneno: `document.querySelectorAll('.marcador').forEach(m => { m.style.zIndex = '5'; m.style.position = 'absolute'; });
             document.querySelectorAll('.capa').forEach(c => c.style.zIndex = '0');`,
    async correr(veneno) {
      const d = medir('/estante', `
        /* O CARTAO E O PRIMEIRO COM MARCADOR, e nao o primeiro da grade.
           Isto era document.querySelector('.livro'), e o marcador so existe em
           livro COM nota: no dia em que a bancada ganhou um trabalho sem nota
           na frente da fila, o m veio nulo e a prova estourou com
           "Cannot read properties of null" — que chega aqui como "nao consegui
           medir", isto e, como falta de servidor. A prova media a sobreposicao
           de um cartao que nao tem sobreposicao para medir. */
        const l = [...document.querySelectorAll('.livro')].find(e => e.querySelector('.marcador'));
        if (!l) return { semMarcador: true };
        const c = l.querySelector('.capa'), m = l.querySelector('.marcador');
        const rc = c.getBoundingClientRect(), rm = m.getBoundingClientRect();
        const filtros = document.querySelector('.recortes');
        /* QUEM ESTA NA FRENTE E CONTA DE PINTURA, e nao de ponteiro.
           Isto era um elementFromPoint no ponto onde os dois se cruzam, e a
           resposta mudou quando a capa ganhou pointer-events: none para
           devolver o clique ao .livro-alvo (R-02): sem receber ponteiro, ela
           sumiu do teste de acerto e a prova acusou regressao numa sobreposicao
           que nao mudou um pixel. Instrumento que mede a coisa errada acusa o
           item errado.
           A ordem de pintura entre irmaos posicionados no mesmo contexto de
           empilhamento e o z-index, e a ordem do DOM desempata. */
        const zi = (e) => { const v = getComputedStyle(e).zIndex; return v === 'auto' ? 0 : Number(v); };
        const zc = zi(c), zm = zi(m);
        const depoisNoDom = !!(m.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
        const na_frente = zc > zm ? 'capa' : zc < zm ? 'marcador' : (depoisNoDom ? 'capa' : 'marcador');
        return { na_frente, z_marca: String(zm), z_capa: String(zc),
                 cruzam: rm.bottom > rc.top && rm.top < rc.bottom,
                 invade_filtros: filtros ? rm.top < filtros.getBoundingClientRect().bottom : false };`, veneno);
      if (d.semMarcador) return 'nenhum livro da estante tem marcador de notas — sem ele nao ha a sobreposicao que este item mede';
      if (d.invade_filtros) return `o marcador alcanca a barra de recortes`;
      if (!String(d.na_frente || '').includes('capa')) return `na sobreposicao quem esta na frente e "${d.na_frente}", e nao a capa (z marca ${d.z_marca}, z capa ${d.z_capa})`;
      return null;
    },
  },
  'r06': {
    erik: 'o item ao lado da busca era de notas, e devia ser de duvidas',
    texto: () => arq('web/src/componentes/Cabecalho.jsx'),
    correr(t) {
      if (!/aria-label="D[úu]vidas"/.test(t)) return 'o atalho ao lado da busca nao se chama Duvidas';
      if (!/iconeDuvidas\s*=\s*"\/icones\/icone-duvidas\.svg"/.test(t)) return 'o icone do atalho nao e o de duvidas';
      if (!/to="\/ajuda"/.test(t)) return 'o atalho nao leva para a ajuda';
      return null;
    },
    veneno: (t) => t.replace('aria-label="Dúvidas"', 'aria-label="Notas"'),
  },
  'r07': {
    erik: 'trocou o icone da Estante',
    /* PROVA POR IMPRESSAO DIGITAL. O defeito original foi os ARQUIVOS estarem
       trocados — `icone-estante.svg` desenhava um "?". Nenhuma leitura de CSS
       pega isso; o que pega e fixar o conteudo dos dois arquivos auditados em
       04/09. Se alguem os trocar de novo, o resumo muda e isto fica vermelho. */
    texto: () => JSON.stringify({
      lugares: arq('web/src/lugares.js'),
      resumos: execSync('shasum -a 256 web/publico/icones/icone-*.svg', { cwd: RAIZ, encoding: 'utf8' }),
    }),
    /* A BIBLIOTECA INTEIRA, e nao os dois de 04/09.
     *
     * A Fase 3 passou glifo contra rotulo nos 27, e o que ela achou nao se
     * enxerga um arquivo por vez: DOIS PARES sao byte a byte iguais —
     * icone-indice.svg e icone-menu.svg, icone-canvas.svg e
     * icone-paginas.svg. Dois nomes, um desenho, quatro lugares na tela. O
     * comentario do `Leitura.jsx` chega a explicar que "o icone do indice e uma
     * LISTA", e ele e o hamburguer do menu.
     *
     * Qual dos dois de cada par e o errado e do QUADRO, e esta no R-49. O que
     * cabe aqui e a impressao digital: fixar os 27 como estavam na auditoria, e
     * recusar par novo. */
    correr(bruto) {
      const { lugares, resumos } = JSON.parse(bruto);
      if (!/id: "estante"[\s\S]{0,200}icone: "\/icones\/icone-estante\.svg"/.test(lugares)) return 'a Estante nao usa o icone-estante.svg';
      const esperados = {
      'icone-aparelho.svg': '7b0016f559dce34bc0a51eb16a5dc8732bc5ad3e8145d6747393ca5894ae6196',
      'icone-baixar.svg': '926132b4d14a21ca14ac6c752de2d309576ea34500462fbdc169d35fe5317bd5',
      'icone-buscar.svg': 'ecb2c0653686aec7a3121aa3f933834d0417a143d5a031a53491a24b738c9ccd',
      'icone-caderno.svg': 'd65bb2ddf07416ef8b74316a0f7da30a580523a48709c86c223fb2f5ef67e9e9',
      'icone-camadas.svg': 'f7a766d36d07b1f645804199ffa86be12cea8570611e40f62e5fbdb2081cc772',
      'icone-canvas.svg': 'f90e29714752fd20d887ff65fbe5813f6e2eeca7d868387d43adb6e43b4db5c4',
      'icone-conta.svg': '9f27d23a1637d08e8c87fc5b1e68e298d6ec0b4db4973346c088e6931940bb0f',
      'icone-copiar.svg': '6cd039b18d0ef514727af5e0101c0724af0cfa0ed750324a0ad89c9b78f5cddc',
      'icone-defeito.svg': '7a5343dccb4d50d4778831fc3ebfdb353ed5f245eb3e98c68e8072f453609983',
      'icone-duvidas.svg': '3f37071634f6c04a690ef4963d61edfce99c45ae4be49136f24755941717d155',
      'icone-enviar.svg': '85e18bb08f9c38f5a7e427791dfec5e0842418c93cb28836a7ce082636dae4af',
      'icone-estante.svg': 'a08ea4aca7c094bcbc045801cf305f029cc5e27c824708a3757c3f5a3e72465d',
      'icone-estudos.svg': '87386e53ba5b3bd01e70234d676d3c6346c20b8bd70d8cef1f2d4276b6b40f2f',
      'icone-fixar.svg': 'ace45115fbd90cade0c20f15c0b7405f51df9851637c43cf9bb22b059b34b287',
      'icone-indice.svg': 'ec02f366132ee4b87e9233bbedab7a5b54cf8ba5fd25cd588f0dc3932eab91bc',
      'icone-mais-acoes.svg': '21c9fc9de7603ee9ea14529fdc71f7b363229eeaf1fdb1c0d3fb74b9cd35d94c',
      'icone-marcador.svg': '50d2de341fa5497b507b310c69fecb950a4ec7635b92b00c39d349df117abe71',
      'icone-menu.svg': 'ec02f366132ee4b87e9233bbedab7a5b54cf8ba5fd25cd588f0dc3932eab91bc',
      'icone-mesa.svg': '684a463040482c0fadd620593990802bd272586f972b538c28101001e96375a9',
      'icone-nota-imagem.svg': '44525d79ed918988d634feaf45f8a9cfd559880984a7c5d820d49b39322f4a3b',
      'icone-nota-nova.svg': '86edb3d160197d915d3644f9e82dbb7061bcc28609aee27d064736afb10762f1',
      'icone-paginas.svg': 'f90e29714752fd20d887ff65fbe5813f6e2eeca7d868387d43adb6e43b4db5c4',
      'icone-preferencias.svg': '9df1b852a6fb4f119f00716cc176f6289a96514155e85b20d7bd5b78e8ecca83',
      'icone-privacidade.svg': '22e10767d5de2e6ff9d75537e2dbd39da42283709ee5b70ec1cf6523928e3ce3',
      'icone-refazer.svg': '4bfe930079ef2515f11f5c40cf2bfe8a5bb42008a6a19006228451aba998f157',
      'icone-remover.svg': 'e959776783a84ecadc8659de5a4d2036915a6a0090dfc64ff415b056576fac7f',
      'icone-renomear.svg': '9ff07eda892cbe1830ade4fed17f79a4658d5a5ee2af89f9426fd2ca2db80738',
      };
      const lidos = new Map();
      for (const linha of resumos.split('\n')) {
        const [resumo, caminho] = linha.trim().split(/\s+/);
        if (!caminho) continue;
        lidos.set(caminho.split('/').pop(), resumo);
      }
      for (const [nome, resumo] of Object.entries(esperados)) {
        if (!lidos.has(nome)) return `o ${nome} sumiu da biblioteca desde a auditoria de 04/09`;
        if (lidos.get(nome) !== resumo) return `${nome} mudou de desenho desde a auditoria de 04/09`;
      }
      for (const nome of lidos.keys()) {
        if (!(nome in esperados)) return `${nome} entrou na biblioteca sem passar pela auditoria`;
      }
      /* NENHUM PAR NOVO. Os dois conhecidos estao escritos aqui porque sao
         divida medida e datada, e nao descuido: fingir que nao existem faria a
         regra passar por omissao.

         ESTA REGRA NAO E ALCANCAVEL HOJE, e vale dizer em vez de deixar
         parecer provada: com a tabela de resumos exata, qualquer arquivo novo
         cai antes em "entrou sem passar pela auditoria", e qualquer copia de um
         existente cai em "mudou de desenho". Ela existe para o dia em que a
         tabela for refeita — quando o quadro disser qual dos dois de cada par
         e o errado, o desenho novo entra e esta linha e a que impede o par
         seguinte de nascer em silencio. Tentei alcanca-la em 04/09 copiando o
         icone-fixar sobre o icone-camadas: quem ficou vermelho foi a impressao
         digital, como esta escrito. */
      const PARES_CONHECIDOS = [
        ['icone-canvas.svg', 'icone-paginas.svg'],
        ['icone-indice.svg', 'icone-menu.svg'],
      ].map((p) => p.join('|'));
      const porResumo = new Map();
      for (const [nome, resumo] of lidos) {
        if (!porResumo.has(resumo)) porResumo.set(resumo, []);
        porResumo.get(resumo).push(nome);
      }
      for (const [, nomes] of porResumo) {
        if (nomes.length < 2) continue;
        const chave = nomes.slice().sort().join('|');
        if (!PARES_CONHECIDOS.includes(chave)) return `dois nomes com o mesmo desenho, e este par e novo: ${nomes.join(' e ')}`;
      }
      return null;
    },
    veneno: (t) => t.replace('icone: \\"/icones/icone-estante.svg\\"', 'icone: \\"/icones/icone-duvidas.svg\\"'),
  },
  'r08': {
    erik: 'nao respeitou o espacamento entre o usuario e a caixa de busca e duvidas',
    /* O VAO VEM DO `gap` DA CAIXA, e nao de margem no filho — a primeira versao
       deste veneno mexia em `margin-inline-start` e a medida continuava dando 56,
       ou seja, o controle negativo PASSAVA envenenado. Um veneno que nao envenena
       prova o contrario do que se queria. */
    veneno: `document.querySelector('.cabecalho-acoes').style.gap = '0px';
             document.querySelector('.cabecalho-atalhos').style.gap = '0px';`,
    async correr(veneno) {
      const d = medir('/estante', `
        const a = document.querySelector('.cabecalho-acoes');
        const f = [...a.children].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, x: r.x, w: r.width }; }).filter(e => e.w > 0);
        const at = document.querySelector('.cabecalho-atalhos');
        const g = [...at.children].map(e => { const r = e.getBoundingClientRect(); return { x: r.x, w: r.width }; });
        return { entre_busca_e_atalhos: Math.round(f[1].x - (f[0].x + f[0].w)), entre_atalhos: Math.round(g[1].x - (g[0].x + g[0].w)) };`, veneno);
      if (d.entre_busca_e_atalhos !== 56) return `entre a busca e os atalhos ha ${d.entre_busca_e_atalhos}px, e o no 900:52331 pede 56`;
      if (d.entre_atalhos !== 16) return `entre os dois atalhos ha ${d.entre_atalhos}px, e o no 900:52339 pede 16`;
      return null;
    },
  },
  'r10': {
    erik: 'clicar na conta navega em vez de abrir um dropdown',
    /* O VENENO TIRA O MENU, e nao navega — e a diferenca e do INSTRUMENTO.
     *
     * A primeira versao reproduzia o defeito ao pe da letra: o clique levava
     * para `/conta`. So que o `medir.mjs` recusa uma medida que pediu uma rota
     * e terminou noutra — a guarda que existe para nao medir a tela errada —, e
     * o controle negativo morria com "nao consegui medir" em vez de acusar.
     * Um veneno so serve se o vermelho que ele produz for o vermelho do
     * defeito.
     *
     * Entao ele reproduz a metade OBSERVAVEL: o botao vira um clone sem
     * manipulador, e o menu deixa de abrir. E o que a pessoa ve quando o clique
     * navega — o dropdown nao existe. */
    veneno: `const b = document.querySelector('button[aria-label="Sua conta"]');
             b.replaceWith(b.cloneNode(true));`,
    async correr(veneno) {
      const d = medir('/estante', `
        const b = document.querySelector('button[aria-label="Sua conta"]');
        if (!b) return { sem_botao: true };
        const antes = location.pathname;
        b.click(); await esperar(700);
        return { navegou: location.pathname !== antes, expandido: b.getAttribute('aria-expanded'),
                 itens: [...document.querySelectorAll('[class*=menu-conta] a')].length };`, veneno);
      if (d.sem_botao) return 'nao ha botao de conta no cabecalho';
      if (d.navegou) return 'clicar na conta NAVEGA em vez de abrir o menu';
      if (d.expandido !== 'true') return 'o botao nao se anuncia expandido';
      if (d.itens < 3) return `o menu abriu com ${d.itens} itens`;
      return null;
    },
  },
  'r12': {
    erik: 'na parte superior do canvas simplesmente tem fundo branco',
    veneno: `const t = document.createElement('div');
             t.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:120px;background:#fff;z-index:9999';
             document.body.appendChild(t);`,
    async correr(veneno) {
      const d = medir('/canvas', `
        const pinta = (e) => { let n = e; while (n) { const c = getComputedStyle(n);
          if (c.backgroundColor && c.backgroundColor !== 'rgba(0, 0, 0, 0)') return { cor: c.backgroundColor, img: (c.backgroundImage || 'none').slice(0, 30) }; n = n.parentElement; } return null; };
        const topo = pinta(document.elementFromPoint(innerWidth / 2, 8));
        const meio = pinta(document.elementFromPoint(innerWidth / 2, innerHeight / 2));
        return { topo, meio };`, veneno);
      if (!d.topo || !d.meio) return 'nao consegui ler quem pinta o canvas';
      if (d.topo.cor !== d.meio.cor) return `o topo e pintado de ${d.topo.cor} e o meio de ${d.meio.cor}`;
      if (!d.topo.img.startsWith('radial-gradient')) return `o topo do canvas nao tem os pontos: ${d.topo.img}`;
      return null;
    },
  },
  'r14': {
    erik: 'nao consigo mover os post-it',
    veneno: `window.addEventListener('pointerdown', (e) => e.stopPropagation(), true);`,
    async correr(veneno) {
      const d = medir('/canvas', `
        const q = s => [...document.querySelectorAll(s)];
        q('button').find(b => /nova nota/i.test(b.getAttribute('aria-label') || b.textContent || '')).click();
        await esperar(900);
        const folha = q('dialog').find(x => x.open);
        const campo = folha && folha.querySelector('textarea, input[type=text]');
        if (campo) { campo.focus();
          Object.getOwnPropertyDescriptor(campo.constructor.prototype, 'value').set.call(campo, 'prova r14');
          campo.dispatchEvent(new Event('input', { bubbles: true })); await esperar(250);
          const por = [...folha.querySelectorAll('button,.botao')].find(b => /superf/i.test(b.textContent));
          if (por) { por.click(); await esperar(1500); } }
        const notas = q('.nota-canvas');
        if (!notas.length) return { sem_nota: true };
        const nota = notas[notas.length - 1], r0 = nota.getBoundingClientRect();
        const o = (x, y) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true });
        const x0 = Math.round(r0.x + r0.width / 2), y0 = Math.round(r0.y + 12);
        nota.dispatchEvent(new PointerEvent('pointerdown', o(x0, y0)));
        for (let i = 1; i <= 20; i++) { window.dispatchEvent(new PointerEvent('pointermove', o(x0 + 140 * i / 20, y0 + 90 * i / 20))); await new Promise(k => requestAnimationFrame(k)); }
        window.dispatchEvent(new PointerEvent('pointerup', o(x0 + 140, y0 + 90)));
        await esperar(600);
        const r1 = nota.getBoundingClientRect();
        return { andou_x: Math.round(r1.x - r0.x), andou_y: Math.round(r1.y - r0.y) };`, veneno);
      if (d.sem_nota) return 'nao consegui criar uma nota no canvas';
      if (Math.abs(d.andou_x) < 40 || Math.abs(d.andou_y) < 30) return `a nota andou ${d.andou_x}x${d.andou_y} para um arrasto de 140x90`;
      return null;
    },
  },
  'r26': {
    erik: 'um tema com duas palavras quebra o layout — remover o "do"',
    texto: () => arq('web/src/jornadas/Leitura.jsx'),
    correr(t) {
      const bloco = /\["claro",[\s\S]{0,900}?\]\.map/.exec(t);
      if (!bloco) return 'nao achei a lista de temas';
      const rotulos = [...bloco[0].matchAll(/\["[a-z]+",\s*"([^"]+)"\]/g)].map((m) => m[1]);
      if (!rotulos.length) return 'a lista de temas nao tem rotulos legiveis';
      const compostos = rotulos.filter((r) => r.trim().includes(' '));
      if (compostos.length) return `tema com mais de uma palavra: ${compostos.join(', ')}`;
      return null;
    },
    veneno: (t) => t.replace('["sistema", "Sistema"]', '["sistema", "Do sistema"]'),
  },
  'r38': {
    erik: 'as telas sobre o canvas pontilhado sao GAVETAS — usar o vaul',
    /* OS COMENTARIOS SAEM ANTES, e a razao apareceu no controle negativo: o
       `modal={false}` esta citado TRES vezes na prosa do `GavetaDeSecao` e uma
       vez como propriedade. O veneno trocava a primeira ocorrencia — um
       comentario — e a prova continuava verde. Comentario que fala do codigo
       nao e o codigo, e um instrumento que le os dois nao distingue os dois. */
    texto: () => [arq('web/package.json'), arq('web/src/componentes/Gaveta.jsx'), arq('web/src/componentes/GavetaDeSecao.jsx')]
      .join('\n/*—*/\n').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' '),
    correr(t) {
      if (!/"vaul":/.test(t)) return 'a vaul nao esta nas dependencias';
      if (!/from "vaul"/.test(t)) return 'nada importa a vaul';
      if (!/modal=\{false\}/.test(t)) return 'a gaveta e modal: prende o foco e apaga o cabecalho, que e o contrario da secao sobreposta';
      return null;
    },
    veneno: (t) => t.replace('modal={false}', 'modal={true}'),
  },
};

/* ── o comando ──────────────────────────────────────────────────────────── */

async function rodar(id, envenenado = false) {
  const p = PROVAS[id];
  if (!p) throw new Error(`prova desconhecida: ${id}`);
  if (p.texto) {
    let t = p.texto();
    if (envenenado) t = p.veneno(t);
    return p.correr(t);
  }
  return p.correr(envenenado ? p.veneno : '');
}

const args = process.argv.slice(2);

if (args.includes('--provar')) {
  const so = args.find((a) => !a.startsWith('--'));
  const ids = so ? [so] : Object.keys(PROVAS);
  let tudoBem = true, indeterminadas = 0;
  for (const id of ids) {
    let limpa, suja;
    /* TERCEIRO SITIO DA MESMA CONFUSAO. Com o servidor fora, o `NaoPodeMedir`
       virava a string 'ERRO: …' e o arquivo anunciava CONTROLE NEGATIVO FALHOU
       — "o controle esta quebrado" quando a verdade e "nao deu para medir".
       Nao saber nao e reprovar, aqui pela mesma razao que no `rejeitado.mjs`. */
    let mudo = false;
    try { limpa = await rodar(id, false); } catch (e) { if (e instanceof NaoPodeMedir) mudo = true; else limpa = 'ERRO: ' + e.message; }
    if (!mudo) { try { suja = await rodar(id, true); } catch (e) { if (e instanceof NaoPodeMedir) mudo = true; else suja = 'ERRO: ' + e.message; } }
    if (mudo) { indeterminadas++; console.log(`  ?      ${id}  indeterminada — nao deu para medir`); continue; }
    const ok = limpa === null && typeof suja === 'string' && !suja.startsWith('ERRO');
    tudoBem &&= ok;
    console.log(`  ${ok ? 'serve  ' : 'FALHOU '} ${id}  limpa: ${limpa === null ? 'passa' : limpa} · envenenada: ${suja || 'PASSOU, e nao devia'}`);
  }
  if (indeterminadas) {
    console.log(`\n${indeterminadas} de ${ids.length} indeterminadas — o servidor de desenvolvimento esta fora.`);
    console.log('Nao e falha do controle: e ausencia de resposta. Suba `cd web && npm run dev` e rode de novo.');
    process.exit(97);
  }
  console.log(tudoBem
    ? '\nCONTROLE NEGATIVO: toda prova passa limpa e reprova envenenada. Serve.'
    : '\nCONTROLE NEGATIVO FALHOU.');
  process.exit(tudoBem ? 0 : 1);
}

if (!args.length) {
  console.log('provas: ' + Object.keys(PROVAS).join(' '));
  process.exit(0);
}

const id = args[0].toLowerCase();
let defeito;
try {
  defeito = await rodar(id, false);
} catch (e) {
  /* SAIR 97 QUANDO NAO DEU PARA MEDIR — e nao 1.
     Codigo 1 quer dizer "o defeito esta la". Servidor fora tambem saia 1, e o
     `rejeitado.mjs` lia isso como REGREDIU: o portao anunciava regressao em
     dez itens porque ninguem tinha subido o `npm run dev`. Portao que grita
     regressao falsa e portao que se aprende a ignorar, e ai ele nao serve nem
     quando a regressao for de verdade.
     Nao poder medir NAO e passar: e nao saber. 97 diz isso. */
  if (e instanceof NaoPodeMedir) { console.error(`${id}: ${e.message}`); process.exit(97); }
  throw e;
}
if (defeito) { console.error(`${id}: ${defeito}`); process.exit(1); }
console.log(`${id}: o defeito nao se reproduz.`);
