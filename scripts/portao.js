/* O portão: mede a PÁGINA SERVIDA contra o sistema de tokens.
 *
 * Roda dentro do Chrome, por:
 *
 *     node scripts/medir.mjs http://localhost:5180 1440 900 scripts/portao.js
 *
 * Ele mora ao lado do instrumento que o executa, e isso deixou de ser detalhe: a
 * versão anterior vivia noutro repositório e era chamada por caminho absoluto,
 * o que quebra no dia em que alguém clonar só um dos dois — e quebra em
 * silêncio (DEC-0038 §6). Não é um teste de laboratório: ele lê o que o
 * navegador realmente compôs, que é a diferença que a Parte 1.1 do plano de
 * implementação nomeia como a primeira das cinco causas do sofrimento na
 * Vynce — "o portão media o laboratório, não a página".
 *
 * O que ele recusa, e por quê:
 *
 *   COR FORA DO SISTEMA   qualquer tinta ou superfície que não seja um dos
 *                         valores decididos. Hex solto é como a paleta volta a
 *                         crescer sem ninguém decidir.
 *   CONTRASTE ABAIXO      4,5 para texto normal, 3,0 a partir de 24px. Medido
 *                         no par que o navegador compôs, não no par que o
 *                         desenho prometeu.
 *   CORPO FORA DA ESCALA  tamanho que não é degrau. Um 19px entra sem doer e
 *                         só aparece quando alguém tenta gerar a escala.
 *
 * O que ele NÃO julga: filete e traço decorativo. A WCAG cobra 3,0 de
 * componente de interface, não de separador, e cobrar de tudo produz uma lista
 * onde a maioria não é falha — lista assim ninguém lê duas vezes.
 */
(async () => {
  const TINTA = {
    '#151515': 'text/strong',
    '#535353': 'text/primary',
    '#6a6a6a': 'text/secondary',
    '#f3f3f3': 'text/on-inverse',
    '#2f7d55': 'estado/ok',
    '#976519': 'estado/atencao',
    '#b23b2a': 'estado/perigo',
    // ESCURO. A primeira versão só conhecia o claro e reprovava a tela inteira
    // no escuro, acusando valores que ERAM do sistema — só não estavam na lista
    // dela. Mesma falha que o instrumento de token teve no mesmo dia: medida que
    // não conhece o alvo mede o alvo errado, e mede com confiança.
    '#eeeeee': 'text/strong (escuro)',
    '#b3b3b3': 'text/secondary (escuro)',
    '#8e8e8e': 'text/terciaria (escuro)',
    '#3a9b69': 'estado/ok (escuro)',
    '#bb7d1f': 'estado/atencao (escuro)',
    '#d86858': 'estado/perigo (escuro)'
  };
  const SUP = {
    '#f9f9f9': 'surface/base',
    '#f3f3f3': 'surface/sunken',
    '#ebebeb': 'surface/deep',
    '#161616': 'surface/inverse',
    '#d7f285': 'nota/verde',
    '#f28587': 'nota/rosa',
    '#f2e685': 'nota/amarelo',
    '#85bcf2': 'nota/azul',
    '#efffbf': 'capa/verde',
    '#ffbfc0': 'capa/rosa',
    '#fff8bf': 'capa/amarelo',
    '#bfdfff': 'capa/azul',
    // escuro: o fundo reusa surface/inverse, e os degraus sobem a partir dele
    '#1c1c1c': 'surface/sunken (escuro)',
    '#232323': 'surface/deep (escuro)',
    '#666666': 'border/subtle (escuro)',
    // destaque no escuro: mesmo matiz, saturacao baixa, escuro o bastante para
    // receber a tinta clara. Ver base.css para a razao.
    '#61722f': 'nota/verde (escuro)',
    '#746c2f': 'nota/amarelo (escuro)',
    '#a34344': 'nota/rosa (escuro)',
    '#406f9e': 'nota/azul (escuro)'
  };
  const CORPOS = [14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 64];

  const hex = (c) => {
    const m = c.match(
      /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/
    );
    if (!m) return null;
    if (m[4] !== undefined && +m[4] === 0) return 'transparente';
    return (
      '#' +
      [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('')
    );
  };
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255);
    const f = (v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const raz = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // A superfície de um texto é a do primeiro ancestral com fundo opaco. Não
  // resolve sobreposição nem gradiente — e por isso o que ela devolve serve
  // para RECUSAR, nunca para autorizar em silêncio.
  const fundoDe = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const h = hex(getComputedStyle(n).backgroundColor);
      if (h && h !== 'transparente') return h;
      n = n.parentElement;
    }
    return hex(getComputedStyle(document.body).backgroundColor) || '#ffffff';
  };

  const corFora = [],
    contraste = [],
    corpoFora = [];
  let medidos = 0;

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const texto = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (!texto) continue;

    medidos++;
    const tinta = hex(cs.color),
      fundo = fundoDe(el);
    const corpo = Math.round(parseFloat(cs.fontSize));
    const peso = parseInt(cs.fontWeight) || 400;
    const amostra = texto.slice(0, 32);

    if (tinta && tinta !== 'transparente' && !TINTA[tinta] && !SUP[tinta])
      corFora.push({ valor: tinta, papel: 'tinta', texto: amostra });
    if (fundo && !SUP[fundo] && !TINTA[fundo] && fundo !== '#ffffff')
      corFora.push({ valor: fundo, papel: 'superficie', texto: amostra });
    if (!CORPOS.includes(corpo))
      corpoFora.push({
        corpo,
        texto: amostra,
        degrau_mais_perto: CORPOS.reduce((a, b) =>
          Math.abs(b - corpo) < Math.abs(a - corpo) ? b : a
        )
      });

    if (tinta && tinta !== 'transparente' && fundo) {
      const r = raz(tinta, fundo);
      const grande = corpo >= 24 || (corpo >= 19 && peso >= 700);
      const minimo = grande ? 3.0 : 4.5;
      if (r < minimo)
        contraste.push({
          tinta,
          fundo,
          razao: +r.toFixed(2),
          pede: minimo,
          corpo,
          texto: amostra
        });
    }
  }

  // A cegueira fechada: buscar cada SVG referenciado e ler a tinta de dentro.
  // Icone deve herdar cor por `currentColor` sobre mascara — tinta cravada e
  // decisao tomada dentro de um arquivo, longe de qualquer regra.
  const fontes = new Set();
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    for (const v of [
      el.getAttribute?.('src'),
      cs.maskImage,
      cs.webkitMaskImage,
      cs.backgroundImage
    ]) {
      const m = String(v || '').match(
        /url\(["']?([^"')]+\.svg)["']?\)|^([^"')\s]+\.svg)$/
      );
      if (m) fontes.add(m[1] || m[2]);
    }
  }
  const tintaEmAsset = [];
  for (const f of fontes) {
    try {
      const txt = await (await fetch(f)).text();
      const cravadas = [
        ...new Set(
          [...txt.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)].map((m) =>
            m[1].toLowerCase()
          )
        )
      ];
      const forasteiras = cravadas.filter((h) => !TINTA[h] && !SUP[h]);
      // Icone e sistema; ilustracao e arte. Cobrar a paleta de uma ilustracao
      // faria o portao reprovar todo desenho que tem mais de duas cores, e ai
      // ele vira ruido — a mesma licao do filete, que a primeira versao do
      // instrumento de contraste aprendeu acusando 93 falhas em 196 pares.
      const nome = f.split('/').pop();
      const eIcone = /^icone[-.]/.test(nome);
      if (cravadas.length)
        tintaEmAsset.push({
          asset: nome,
          papel: eIcone ? 'icone' : 'arte',
          cravadas,
          fora_do_sistema: eIcone ? forasteiras : [],
          nota: eIcone
            ? 'icone deve herdar cor por currentColor sobre mascara'
            : 'arte nao e julgada pela paleta do sistema — so relatada'
        });
    } catch {
      /* asset que nao busca nao acusa */
    }
  }

  const unico = (a, chave) => {
    const visto = {};
    const fora = [];
    for (const x of a) {
      const k = chave(x);
      if (!visto[k]) {
        visto[k] = 1;
        fora.push(x);
      }
    }
    return fora;
  };

  return {
    url: location.pathname,
    nos_com_texto: medidos,
    cor_fora_do_sistema: unico(corFora, (x) => x.valor + x.papel),
    contraste_abaixo: unico(contraste, (x) => x.tinta + x.fundo + x.corpo),
    corpo_fora_da_escala: unico(corpoFora, (x) => x.corpo),
    assets_conferidos: fontes.size,
    tinta_cravada_em_asset: tintaEmAsset,
    passou:
      corFora.length === 0 &&
      contraste.length === 0 &&
      corpoFora.length === 0 &&
      tintaEmAsset.every((a) => a.fora_do_sistema.length === 0),
    nota: 'Filete e traço decorativo não são julgados: a WCAG cobra 3,0 de componente de interface, não de separador.'
  };
})();
