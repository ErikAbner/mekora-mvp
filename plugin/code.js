// Mekora — correções do sistema
//
// Por que este plugin existe, e não uma sessão de IA escrevendo direto:
// os dois conectores MCP do Figma têm metades diferentes do que é preciso.
// O remoto (mcp.figma.com) escreve mas não enxerga a Zodiak; o local
// (127.0.0.1:3845) enxerga a fonte mas é somente leitura. Um plugin roda na
// máquina do Erik, com a Plugin API inteira E as fontes dele. Ver
// docs/references/auditoria-escala-espacamento-resiliencia-mekora-2026-08-27.md
// Parte D.3 no Project OS.
//
// REGRA DESTE ARQUIVO: nada aqui roda sozinho. Cada correção é um botão, e
// toda correção RELATA o que fez — nó tocado, valor antes e valor depois.
// Aplicar sem provar é o que a DEC-0006 existe para impedir.

figma.showUI(__html__, { width: 460, height: 620 });

// ─── As correções, uma entrada por botão ───────────────────────────────────
//
// Cada uma nasce de uma medição registrada no Project OS. O campo `porque`
// não é comentário: é o que aparece na interface, para ninguém aplicar sem
// saber o motivo.

const ENTRELINHA = [
  {
    style: "Heading/H6-Italico-24",
    de: 54,
    para: 32,
    porque:
      "24/54 é 225% do corpo. Os 16 nós que o usam são todos de uma linha, " +
      "então o defeito nunca apareceu — e explode no primeiro texto que quebrar.",
  },
  {
    style: "DestaquePersonalizado-italico-64",
    de: 54,
    para: 72,
    porque:
      "64/54 é 84% do corpo. Os 23 nós têm 1 caractere cada: é capitular, " +
      "não heading. Corpo + 8 dá 72.",
  },
];

// Este fica separado porque tem uma decisão dentro, e não é minha.
const H5 = {
  style: "Heading/H5-Bold-28",
  gemeo: "Heading/H5-Bold-28-Sem padding",
  de: 24,
  para: 36,
  porque:
    "28/24 é o único style do arquivo com entrelinha MENOR que o corpo. " +
    "Já foi contornado uma vez por cópia: o gêmeo 'Sem padding' é 28/36 e " +
    "tem mais consumidores. Corrigir o valor cria uma duplicata verdadeira; " +
    "absorver resolve de vez, mas apaga um style.",
};

// ─── Utilidades ────────────────────────────────────────────────────────────

async function carregarFonte(style) {
  // A recomendação canônica: carregar a fonte do próprio style, nunca uma
  // padrão. A Zodiak Variable resolve por instância nomeada, e chutar o nome
  // do peso é a origem clássica de "Cannot write to node with unloaded font".
  await figma.loadFontAsync(style.fontName);
}

async function acharStyle(nome) {
  const todos = await figma.getLocalTextStylesAsync();
  return todos.filter((s) => s.name === nome);
}

function px(v) {
  return { unit: "PIXELS", value: v };
}

// ─── Ato 1 · entrelinha, os dois sem ambiguidade ───────────────────────────

async function corrigirEntrelinha() {
  const relato = [];

  for (const item of ENTRELINHA) {
    const achados = await acharStyle(item.style);

    if (achados.length === 0) {
      relato.push({ style: item.style, estado: "não encontrado", tocados: 0 });
      continue;
    }
    if (achados.length > 1) {
      // Dois styles com o mesmo nome já existem neste arquivo. Parar é o certo:
      // aplicar no primeiro que aparecer seria escolher no escuro.
      relato.push({
        style: item.style,
        estado: `AMBÍGUO — ${achados.length} styles com este nome. Nada foi tocado.`,
        tocados: 0,
      });
      continue;
    }

    const s = achados[0];
    const antes = s.lineHeight && s.lineHeight.value;

    if (antes !== item.de) {
      // O valor não é o que a medição registrou. Alguém já mexeu, ou a
      // medição envelheceu — nos dois casos, parar e contar.
      relato.push({
        style: item.style,
        estado: `esperava ${item.de}, achou ${antes}. Nada foi tocado.`,
        tocados: 0,
      });
      continue;
    }

    await carregarFonte(s);
    s.lineHeight = px(item.para);

    const conferido = (await acharStyle(item.style))[0].lineHeight.value;
    relato.push({
      style: item.style,
      estado: conferido === item.para ? "aplicado" : "FALHOU ao conferir",
      antes,
      depois: conferido,
      corpo: s.fontSize,
      tocados: 1,
    });
  }

  return relato;
}

// ─── Ato 2 · o H5, com a escolha explícita ─────────────────────────────────

async function corrigirH5(modo) {
  const quebrados = await acharStyle(H5.style);
  const gemeos = await acharStyle(H5.gemeo);

  if (quebrados.length !== 1) {
    return [{ style: H5.style, estado: `esperava 1 style, achou ${quebrados.length}. Nada foi tocado.`, tocados: 0 }];
  }
  const quebrado = quebrados[0];

  if (modo === "valor") {
    if (quebrado.lineHeight.value !== H5.de) {
      return [{ style: H5.style, estado: `esperava ${H5.de}, achou ${quebrado.lineHeight.value}. Nada foi tocado.`, tocados: 0 }];
    }
    await carregarFonte(quebrado);
    quebrado.lineHeight = px(H5.para);
    return [
      {
        style: H5.style,
        estado: "aplicado — atenção: agora é idêntico ao gêmeo, e a duplicata se resolve na migração",
        antes: H5.de,
        depois: (await acharStyle(H5.style))[0].lineHeight.value,
        tocados: 1,
      },
    ];
  }

  // modo === "absorver"
  if (gemeos.length !== 1) {
    return [{ style: H5.gemeo, estado: `esperava 1 gêmeo, achou ${gemeos.length}. Nada foi tocado.`, tocados: 0 }];
  }
  const gemeo = gemeos[0];

  // Guarda que faltava, e a ausência dela foi usada em 2026-08-29: a absorção
  // rodou sobre um style que o Erik já tinha corrigido à mão. Deu certo por
  // sorte — os dois estavam em 28/36 e mover os nós não mudou pixel. Se ele
  // tivesse escolhido outro valor, os 10 nós teriam ido para um style
  // diferente, em silêncio, e sem volta.
  //
  // Absorver é irreversível. Só se absorve o que é comprovadamente igual.
  const a = { corpo: quebrado.fontSize, entre: quebrado.lineHeight.value, peso: quebrado.fontName.style };
  const b = { corpo: gemeo.fontSize, entre: gemeo.lineHeight.value, peso: gemeo.fontName.style };
  if (a.corpo !== b.corpo || a.entre !== b.entre || a.peso !== b.peso) {
    return [
      {
        style: H5.style,
        estado:
          `MÉTRICAS DIFERENTES — ${a.corpo}/${a.entre} ${a.peso} contra ` +
          `${b.corpo}/${b.entre} ${b.peso}. Absorver mudaria a aparência dos nós, ` +
          `e é irreversível. Nada foi tocado.`,
        tocados: 0,
      },
    ];
  }

  // Reaplicar o gêmeo em cada consumidor do quebrado, e SÓ ENTÃO apagar.
  // A ordem importa: apagar antes deixaria os nós sem style nenhum.
  const page = figma.currentPage;
  const alvos = page
    .findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => t.textStyleId === quebrado.id);

  const tocados = [];
  for (const t of alvos) {
    await figma.loadFontAsync(t.fontName);
    await t.setTextStyleIdAsync(gemeo.id);
    tocados.push({ id: t.id, texto: (t.characters || "").slice(0, 30) });
  }

  const restantes = page
    .findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => t.textStyleId === quebrado.id).length;

  if (restantes > 0) {
    return [
      {
        style: H5.style,
        estado: `${tocados.length} reaplicados, mas ${restantes} ainda usam o style. NÃO apaguei.`,
        tocados: tocados.length,
        nos: tocados,
      },
    ];
  }

  quebrado.remove();
  return [
    {
      style: H5.style,
      estado: `absorvido em "${H5.gemeo}" e apagado`,
      tocados: tocados.length,
      nos: tocados,
    },
  ];
}

// ─── Ato 3 · o "3" duplicado na tela de entrada do Kindle ──────────────────

async function corrigirContadorKindle() {
  const page = figma.currentPage;
  const tela = page.children.find((n) => n.name === "Kindle · 0 — vamos conectar");
  if (!tela) {
    return [{ estado: "tela 'Kindle · 0 — vamos conectar' não encontrada nesta página. Nada foi tocado." }];
  }

  // A lista numera 1, 2, 3, 3 — o quarto deveria ser 4. Procuro os textos que
  // são só o dígito, na ordem em que aparecem de cima para baixo.
  const digitos = tela
    .findAllWithCriteria({ types: ["TEXT"] })
    .filter((t) => /^\s*\d\s*$/.test(t.characters || ""))
    .sort((a, b) => a.absoluteTransform[1][2] - b.absoluteTransform[1][2]);

  const sequencia = digitos.map((t) => (t.characters || "").trim()).join(",");
  if (sequencia !== "1,2,3,3") {
    return [
      {
        estado: `esperava a sequência 1,2,3,3 e achei "${sequencia}". Nada foi tocado.`,
        tocados: 0,
      },
    ];
  }

  const ultimo = digitos[digitos.length - 1];
  await figma.loadFontAsync(ultimo.fontName);
  ultimo.characters = "4";

  return [
    {
      estado: "aplicado",
      no: ultimo.id,
      antes: "3",
      depois: ultimo.characters,
      tocados: 1,
    },
  ];
}

// ─── Ato 4 · a duplicata Heading/H6-Medium-24 ──────────────────────────────
//
// Dois styles, o MESMO nome, métricas idênticas: 24/32 Regular. Um tem 32
// consumidores e o outro 261. Precisa morrer ANTES da renomeação — se os dois
// virarem "Body/Large", o problema volta com nome novo.

async function absorverDuplicata() {
  const dups = await acharStyle("Heading/H6-Medium-24");
  if (dups.length === 0) return [{ estado: "já não existe duplicata. Nada a fazer.", tocados: 0 }];
  if (dups.length === 1) return [{ estado: "só existe um. A duplicata já foi resolvida.", tocados: 0 }];
  if (dups.length > 2) return [{ estado: `achei ${dups.length} com este nome, esperava 2. Nada foi tocado.`, tocados: 0 }];

  const page = figma.currentPage;
  const textos = page.findAllWithCriteria({ types: ["TEXT"] });
  const consumidores = (id) => textos.filter((t) => t.textStyleId === id);

  const [a, b] = dups;
  const na = consumidores(a.id).length;
  const nb = consumidores(b.id).length;

  // O que fica é o de MAIS consumidores: menos nós a mover, menos a errar.
  const fica = na >= nb ? a : b;
  const sai = na >= nb ? b : a;

  // Mesma guarda do Ato 2: absorver é irreversível, só se absorve o igual.
  if (
    fica.fontSize !== sai.fontSize ||
    fica.lineHeight.value !== sai.lineHeight.value ||
    fica.fontName.style !== sai.fontName.style
  ) {
    return [
      {
        estado:
          `MÉTRICAS DIFERENTES apesar do nome igual — ${sai.fontSize}/${sai.lineHeight.value} ` +
          `${sai.fontName.style} contra ${fica.fontSize}/${fica.lineHeight.value} ${fica.fontName.style}. ` +
          `Nada foi tocado.`,
        tocados: 0,
      },
    ];
  }

  const alvos = consumidores(sai.id);
  const tocados = [];
  for (const t of alvos) {
    await figma.loadFontAsync(t.fontName);
    await t.setTextStyleIdAsync(fica.id);
    tocados.push({ id: t.id, texto: (t.characters || "").slice(0, 24) });
  }

  const restantes = page.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.textStyleId === sai.id).length;
  if (restantes > 0) {
    return [{ estado: `${tocados.length} reaplicados, mas ${restantes} ainda usam. NÃO apaguei.`, tocados: tocados.length }];
  }

  sai.remove();
  return [
    {
      estado: `duplicata absorvida — ${tocados.length} nós movidos para o style de ${Math.max(na, nb)} consumidores, e o outro apagado`,
      metricas: `${fica.fontSize}/${fica.lineHeight.value} ${fica.fontName.style}`,
      tocados: tocados.length,
      nos: tocados.slice(0, 8),
    },
  ];
}

// ─── Ato 5 · a renomeação ──────────────────────────────────────────────────
//
// Ordem CRESCENTE de consumidores, e o motivo não é conforto: erro de método
// aparece no primeiro e custa 2 nós, não 477.
//
// Tamanho e peso saem do nome. O motivo forte não é elegância — é que a Zodiak
// Variable tem padrão de eixo wght=900, então o que a API reporta nem sempre
// bate com o que o nome declara. Nome que a ferramenta não confirma é nome
// inverificável. Ver DEC-0035 §2.
//
// FORA desta lista, de propósito: `Body-medium-20px`, 20/32 com 64
// consumidores. A auditoria mandava absorvê-lo em `Body-regular-20px`, mas as
// métricas diferem — 32 contra 30 — e absorver mudaria a aparência. Nomear
// exige decidir antes o que ele é, e isso é do Erik.

const RENOMEAR = [
  { de: "Heading/H1-Extrabold-64",          para: "Display/Large",            cons: 2 },
  { de: "body-italico-20",                  para: "Label/Small/Caps",         cons: 2 },
  { de: "Heading/H2-Semibold-48",           para: "Heading/XL",               cons: 7 },
  { de: "Bodylongo-regular-20px",           para: "Body/Medium/Prosa",        cons: 12 },
  { de: "Heading/H6-Semibold-24",           para: "Heading/XS",               cons: 16 },
  { de: "Heading/H6-Italico-24",            para: "Heading/XS/Italic",        cons: 16 },
  { de: "DestaquePersonalizado-italico-64", para: "Display/Large/Capitular",  cons: 23 },
  { de: "Heading/H7-Regular-18",            para: "Label/Large",              cons: 30 },
  { de: "Heading/H3-Semibold-40",           para: "Heading/LG",               cons: 32 },
  { de: "Heading/H4-Bold-32",               para: "Heading/MD",               cons: 43 },
  { de: "Heading/H5-Bold-28-Sem padding",   para: "Heading/SM",               cons: 52 },
  { de: "label-small-regular-14",           para: "Label/Small",              cons: 117 },
  { de: "Descricao-regular-16",             para: "Body/Small",               cons: 198 },
  { de: "Heading/H6-Medium-24",             para: "Body/Large",               cons: 261 },
  { de: "Body-regular-20px",                para: "Body/Medium",              cons: 384 },
  { de: "labelbotao-regular-16",            para: "Label/Medium",             cons: 477 },
];

async function renomear() {
  // Barreira: se a duplicata ainda existir, renomear criaria dois "Body/Large".
  const dups = await acharStyle("Heading/H6-Medium-24");
  if (dups.length > 1) {
    return [{ estado: "A duplicata Heading/H6-Medium-24 ainda existe. Rode o Ato 4 primeiro. Nada foi tocado.", tocados: 0 }];
  }

  const relato = [];
  for (const item of RENOMEAR) {
    const achados = await acharStyle(item.de);
    if (achados.length !== 1) {
      relato.push({ de: item.de, estado: `esperava 1 style, achou ${achados.length}. Pulado.`, tocados: 0 });
      continue;
    }
    // O destino não pode já existir — senão a renomeação cria uma duplicata.
    const jaExiste = await acharStyle(item.para);
    if (jaExiste.length > 0) {
      relato.push({ de: item.de, estado: `"${item.para}" JÁ EXISTE. Pulado para não duplicar.`, tocados: 0 });
      continue;
    }
    const s = achados[0];
    s.name = item.para;
    const conferido = (await acharStyle(item.para)).length === 1;
    relato.push({
      de: item.de,
      para: item.para,
      cons: item.cons,
      metricas: `${s.fontSize}/${s.lineHeight.value} ${s.fontName.style}`,
      estado: conferido ? "renomeado" : "FALHOU ao conferir",
      tocados: conferido ? 1 : 0,
    });
  }
  return relato;
}

// ─── Ato 6 · Body-medium-20px absorvido em Body/Medium ─────────────────────
//
// EXCEÇÃO APROVADA, e por isso não passa pela guarda genérica do Ato 2: as
// métricas DIFEREM — 20/32 contra 20/30. Absorver muda a entrelinha de 64 nós.
//
// O que autoriza: os 64 são de UMA LINHA, máximo 27 caracteres, e 38 são hug.
// A entrelinha de 32 nunca aparece em nenhum deles — é invisível hoje e
// continuaria invisível. Medido em 2026-08-29, e RECONFERIDO aqui antes de
// escrever, porque medição envelhece.
//
// Se qualquer nó tiver virado multilinha desde a medição, isto para.

async function absorverBodyMedium() {
  const saiN = "Body-medium-20px";
  const ficaN = "Body/Medium";
  const sais = await acharStyle(saiN);
  const ficas = await acharStyle(ficaN);
  if (sais.length !== 1 || ficas.length !== 1) {
    return [{ estado: `esperava 1 de cada, achei ${sais.length} e ${ficas.length}. Nada foi tocado.`, tocados: 0 }];
  }
  const sai = sais[0], fica = ficas[0];

  const page = figma.currentPage;
  const alvos = page.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.textStyleId === sai.id);

  // A prova, refeita agora: nenhum pode ser multilinha.
  const entreAtual = sai.lineHeight.value;
  const multilinha = alvos.filter((t) => t.height >= 2 * entreAtual - 6);
  if (multilinha.length > 0) {
    return [
      {
        estado:
          `${multilinha.length} nós QUEBRAM linha — a entrelinha deixou de ser invisível e ` +
          `absorver mudaria a aparência. Nada foi tocado.`,
        nos: multilinha.slice(0, 6).map((t) => ({ id: t.id, texto: (t.characters || "").slice(0, 30) })),
        tocados: 0,
      },
    ];
  }

  const tocados = [];
  for (const t of alvos) {
    await figma.loadFontAsync(t.fontName);
    await t.setTextStyleIdAsync(fica.id);
    tocados.push({ id: t.id, texto: (t.characters || "").slice(0, 24) });
  }
  const restantes = page.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.textStyleId === sai.id).length;
  if (restantes > 0) {
    return [{ estado: `${tocados.length} reaplicados, mas ${restantes} ainda usam. NÃO apaguei.`, tocados: tocados.length }];
  }
  sai.remove();
  return [
    {
      estado: `absorvido em "${ficaN}" e apagado — entrelinha 32 → 30, invisível nos ${tocados.length}`,
      tocados: tocados.length,
      nos: tocados.slice(0, 8),
    },
  ];
}

// ─── Cor · utilidades ──────────────────────────────────────────────────────

async function acharCor(nome) {
  const todos = await figma.getLocalPaintStylesAsync();
  return todos.filter((s) => s.name === nome);
}

function hexDe(style) {
  const p = style.paints && style.paints[0];
  if (!p || p.type !== "SOLID") return null;
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return ("#" + h(p.color.r) + h(p.color.g) + h(p.color.b)).toUpperCase();
}

// ─── Ato 7 · cor, rodada 1: superfícies e nomes ────────────────────────────
//
// Duas superfícies claras são absorvidas em branco puro. Medido: #F9FAFD está
// a 1,044:1 de #FFFFFF e #F8F8FA a 1,061:1. Nenhum olho separa isso — e
// "Azull of white - cards" ainda tem erro de digitação e codifica um COMPONENTE
// no nome de uma paleta, que é o que o próprio sistema proíbe na tipografia.
//
// E a inversão que a medição pediu: `Cinza escuro` é a tinta de 214 nós de
// texto, quase todo título e corpo grande. `Preto` tem 20. O primário real é o
// Cinza escuro; o Preto é a exceção. Ver auditoria de UX de 27/08, Parte A.

const SUPERFICIES_ABSORVER = [
  { sai: "Branco - Azul", fica: "Branco 100%", dist: "1,044:1" },
  { sai: "Azull of white - cards", fica: "Branco 100%", dist: "1,061:1" },
];

const COR_RENOMEAR = [
  { de: "Cinza escuro",  para: "text/primary",    nota: "12,81 sobre branco · 214 nós de texto" },
  { de: "Preto",         para: "text/strong",     nota: "19,46 · reservado, 20 nós" },
  { de: "Branco 100%",   para: "surface/base",    nota: "" },
  { de: "Branco - mid",  para: "surface/raised",  nota: "a única separação real, 1,10:1" },
  { de: "Estado - Ativo", para: "surface/inverse", nota: "38 nós, TODOS em FRAME e nenhum em TEXT" },
  { de: "Cinza - Claro", para: "border/subtle",   nota: "246 nós, só traço" },
];

async function corRodada1() {
  const relato = [];
  const page = figma.currentPage;
  const todos = page.findAll(() => true);

  for (const item of SUPERFICIES_ABSORVER) {
    const sais = await acharCor(item.sai);
    const ficas = await acharCor(item.fica);
    if (sais.length !== 1 || ficas.length !== 1) {
      relato.push({ acao: "absorver", de: item.sai, estado: `esperava 1 de cada, achei ${sais.length} e ${ficas.length}. Pulado.`, tocados: 0 });
      continue;
    }
    const sai = sais[0], fica = ficas[0];
    const tocados = [];
    for (const n of todos) {
      if ("fillStyleId" in n && n.fillStyleId === sai.id) { await n.setFillStyleIdAsync(fica.id); tocados.push(n.id); }
      if ("strokeStyleId" in n && n.strokeStyleId === sai.id) { await n.setStrokeStyleIdAsync(fica.id); tocados.push(n.id); }
    }
    const sobrou = todos.filter((n) => ("fillStyleId" in n && n.fillStyleId === sai.id) || ("strokeStyleId" in n && n.strokeStyleId === sai.id)).length;
    if (sobrou > 0) {
      relato.push({ acao: "absorver", de: item.sai, estado: `${tocados.length} movidos, ${sobrou} sobraram. NÃO apaguei.`, tocados: tocados.length });
      continue;
    }
    sai.remove();
    relato.push({ acao: "absorver", de: item.sai, para: item.fica, dist: item.dist, estado: "absorvido e apagado", tocados: tocados.length });
  }

  for (const item of COR_RENOMEAR) {
    const achados = await acharCor(item.de);
    if (achados.length !== 1) {
      relato.push({ acao: "renomear", de: item.de, estado: `esperava 1, achei ${achados.length}. Pulado.`, tocados: 0 });
      continue;
    }
    const jaExiste = await acharCor(item.para);
    if (jaExiste.length > 0) {
      relato.push({ acao: "renomear", de: item.de, estado: `"${item.para}" JÁ EXISTE. Pulado.`, tocados: 0 });
      continue;
    }
    const s = achados[0];
    const hex = hexDe(s);
    s.name = item.para;
    relato.push({ acao: "renomear", de: item.de, para: item.para, hex, nota: item.nota, estado: "renomeado", tocados: 1 });
  }
  return relato;
}

// ─── Ato 8 · cor, rodada 2: o Cinza dividido pelo trabalho ─────────────────
//
// `Cinza` #727274 faz TRÊS trabalhos ao mesmo tempo — preenchimento de texto,
// traço de vetor e preenchimento de frame — e cada um tem exigência de
// contraste diferente. Texto precisa de 4,5 e ele dá 4,36 sobre a superfície
// elevada: FALHA. Traço precisa de 3,0 e ele passa com folga.
//
// A divisão: o TEXTO vai para #666668, que dá 5,73 sobre a base e 5,21 sobre a
// elevada. O resto fica onde está.
//
// A ARMADILHA que a medição de 29/08 revelou tarde: sobre a superfície escura
// #070808, o #666668 dá 3,50 e o #727274 dá 4,18. Os DOIS falham para texto —
// e mover um nó que está no escuro o deixaria PIOR. Este ato detecta a
// superfície de cada nó e recusa mover os que estão sobre fundo escuro,
// relatando-os para decisão separada.

function luminancia(c) {
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

// Sobe a árvore procurando o primeiro ancestral com preenchimento sólido.
// É aproximação — não resolve sobreposição nem gradiente —, e por isso o que
// ela devolve serve para RECUSAR, nunca para autorizar em silêncio.
function fundoDe(no) {
  let n = no.parent;
  while (n && n.type !== "PAGE") {
    const f = n.fills;
    if (Array.isArray(f) && f.length) {
      const solido = f.filter((x) => x.type === "SOLID" && x.visible !== false).pop();
      if (solido) return { lum: luminancia(solido.color), no: n.name };
    }
    n = n.parent;
  }
  return null; // sem fundo declarado: assume-se a superfície da página
}

async function corRodada2() {
  const cinzas = await acharCor("Cinza");
  const mids = await acharCor("Cinza - Mid ton");
  if (cinzas.length !== 1 || mids.length !== 1) {
    return [{ estado: `esperava 1 de cada, achei ${cinzas.length} e ${mids.length}. Nada foi tocado.`, tocados: 0 }];
  }
  const cinza = cinzas[0], mid = mids[0];

  if (hexDe(cinza) !== "#727274" || hexDe(mid) !== "#666668") {
    return [{ estado: `valores mudaram — ${hexDe(cinza)} e ${hexDe(mid)}. Nada foi tocado.`, tocados: 0 }];
  }

  const page = figma.currentPage;
  const textos = page.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => t.fillStyleId === cinza.id);

  const movidos = [];
  const noEscuro = [];
  for (const t of textos) {
    const fundo = fundoDe(t);
    // Limiar: abaixo de 0,18 de luminância é fundo escuro. #070808 dá ~0,003;
    // #F3F4F7 dá ~0,90. Não há nada ambíguo entre os dois neste arquivo.
    if (fundo && fundo.lum < 0.18) {
      noEscuro.push({ id: t.id, texto: (t.characters || "").slice(0, 28), fundo: fundo.no });
      continue;
    }
    await t.setFillStyleIdAsync(mid.id);
    movidos.push({ id: t.id, texto: (t.characters || "").slice(0, 24) });
  }

  const relato = [
    {
      acao: "dividir",
      estado: `${movidos.length} nós de TEXTO movidos para #666668`,
      ganho: "5,73 sobre surface/base e 5,21 sobre surface/raised — passa AA nas duas",
      tocados: movidos.length,
      nos: movidos.slice(0, 8),
    },
  ];

  if (noEscuro.length) {
    relato.push({
      acao: "RECUSADO",
      estado:
        `${noEscuro.length} nós de texto estão sobre FUNDO ESCURO e NÃO foram movidos. ` +
        `Sobre #070808 o #666668 dá 3,50 e o #727274 dá 4,18: os dois falham AA para texto. ` +
        `Mover pioraria. Precisa de uma cor própria para texto no escuro — decisão do Erik.`,
      tocados: 0,
      nos: noEscuro.slice(0, 10),
    });
  }

  // Só renomeia o que sobrou fazendo um trabalho só.
  const restantes = page.findAll(() => true).filter(
    (n) => ("fillStyleId" in n && n.fillStyleId === cinza.id) || ("strokeStyleId" in n && n.strokeStyleId === cinza.id)
  ).length;

  if (noEscuro.length === 0) {
    mid.name = "text/secondary";
    cinza.name = "icon/default";
    relato.push({ acao: "renomear", estado: `"Cinza - Mid ton" → text/secondary · "Cinza" → icon/default (${restantes} usos restantes, todos não-texto)`, tocados: 2 });
  } else {
    relato.push({
      acao: "renomear",
      estado: `NÃO renomeei: o Cinza ainda carrega ${noEscuro.length} nós de texto no escuro. Um nome "icon/default" mentiria enquanto isso for verdade.`,
      tocados: 0,
    });
  }
  return relato;
}

// ─── Ato 9 · variáveis de cor ──────────────────────────────────────────────
//
// Era o plano do Erik desde o começo: "criar estilos para que só depois a gente
// transforme em variável, já que é melhor você ter uma boa base para só
// converter". A base ficou pronta — nomes por papel, zero duplicata, valores
// decididos —, então a conversão é mecânica.
//
// O QUE JÁ EXISTE, e é aproveitado em vez de duplicado: uma coleção com uma
// variável chamada "Preto", e o `text/strong` já ligado a ela. Ela é renomeada,
// não recriada — recriar quebraria o vínculo que já existe.
//
// UM MODO SÓ, chamado "Claro". A tela `Leitura — aparência` do protótipo tem
// Tema: Claro / Escuro, então o escuro vai existir. Mas os valores dele NÃO
// estão decididos, e inventá-los aqui seria registrar uma escolha que ninguém
// fez. Nomear o modo agora faz o segundo entrar depois sem reestruturar nada.
//
// ESCOPO EXPLÍCITO em cada variável. O padrão ALL_SCOPES polui todo seletor de
// propriedade — cor de texto aparecendo como opção de borda, superfície como
// opção de tinta. É o mesmo defeito de nome que promete mais do que entrega,
// na forma de menu.

const VARIAVEIS_COR = [
  { style: "text/strong",     escopos: ["TEXT_FILL"] },
  { style: "text/primary",    escopos: ["TEXT_FILL"] },
  { style: "text/secondary",  escopos: ["TEXT_FILL"] },
  { style: "surface/base",    escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { style: "surface/raised",  escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { style: "surface/inverse", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { style: "icon/default",    escopos: ["SHAPE_FILL", "STROKE_COLOR"] },
  { style: "border/subtle",   escopos: ["STROKE_COLOR"] },
];

async function criarVariaveisDeCor() {
  const relato = [];
  const cols = await figma.variables.getLocalVariableCollectionsAsync();

  // Reaproveita a coleção existente. Criar outra deixaria duas, e a antiga já
  // carrega um vínculo vivo.
  let col = cols[0];
  if (!col) {
    col = figma.variables.createVariableCollection("Mekora");
    relato.push({ acao: "coleção", estado: "criada — não existia nenhuma", nome: "Mekora" });
  } else {
    const antes = col.name;
    if (col.name !== "Mekora") col.name = "Mekora";
    const modo = col.modes[0];
    const modoAntes = modo.name;
    if (modo.name !== "Claro") col.renameMode(modo.modeId, "Claro");
    relato.push({
      acao: "coleção",
      estado: `reaproveitada — "${antes}" → "Mekora", modo "${modoAntes}" → "Claro"`,
      nota: "o modo Escuro entra depois, quando os valores forem decididos",
    });
  }
  const modoId = col.modes[0].modeId;

  // Índice do que já existe, por nome.
  const existentes = {};
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) existentes[v.name] = v;
  }

  for (const item of VARIAVEIS_COR) {
    const estilos = await acharCor(item.style);
    if (estilos.length !== 1) {
      relato.push({ style: item.style, estado: `esperava 1 paint style, achei ${estilos.length}. Pulado.`, tocados: 0 });
      continue;
    }
    const ps = estilos[0];
    const paint = ps.paints[0];
    if (!paint || paint.type !== "SOLID") {
      relato.push({ style: item.style, estado: "não é preenchimento sólido. Pulado.", tocados: 0 });
      continue;
    }

    // Já ligado? Então só acerta nome e escopo, e não recria.
    const jaLigado = paint.boundVariables && paint.boundVariables.color;
    let v = existentes[item.style];

    if (!v && jaLigado) {
      const atual = await figma.variables.getVariableByIdAsync(jaLigado.id);
      if (atual) {
        const nomeAntes = atual.name;
        atual.name = item.style;
        atual.scopes = item.escopos;
        relato.push({
          style: item.style,
          estado: `variável JÁ EXISTIA e estava ligada — renomeada de "${nomeAntes}" e escopo corrigido`,
          escopos: item.escopos,
          tocados: 1,
        });
        continue;
      }
    }

    if (!v) {
      v = figma.variables.createVariable(item.style, col, "COLOR");
      v.setValueForMode(modoId, { r: paint.color.r, g: paint.color.g, b: paint.color.b });
    }
    v.scopes = item.escopos;

    // Liga o paint style à variável. setBoundVariableForPaint devolve um paint
    // NOVO — tem de ser capturado e reatribuído, senão nada acontece.
    const novo = figma.variables.setBoundVariableForPaint(paint, "color", v);
    ps.paints = [novo];

    const conferido = ps.paints[0].boundVariables && ps.paints[0].boundVariables.color;
    relato.push({
      style: item.style,
      estado: conferido ? "variável criada e ligada" : "FALHOU ao ligar",
      escopos: item.escopos,
      tocados: conferido ? 1 : 0,
    });
  }
  return relato;
}

// ─── Ligação com a interface ───────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  try {
    let relato;
    if (msg.tipo === "entrelinha") relato = await corrigirEntrelinha();
    else if (msg.tipo === "h5-valor") relato = await corrigirH5("valor");
    else if (msg.tipo === "h5-absorver") relato = await corrigirH5("absorver");
    else if (msg.tipo === "kindle") relato = await corrigirContadorKindle();
    else if (msg.tipo === "duplicata") relato = await absorverDuplicata();
    else if (msg.tipo === "renomear") relato = await renomear();
    else if (msg.tipo === "body-medium") relato = await absorverBodyMedium();
    else if (msg.tipo === "cor1") relato = await corRodada1();
    else if (msg.tipo === "cor2") relato = await corRodada2();
    else if (msg.tipo === "variaveis") relato = await criarVariaveisDeCor();
    else relato = [{ estado: "ação desconhecida" }];

    figma.ui.postMessage({ ok: true, relato });
  } catch (e) {
    figma.ui.postMessage({ ok: false, erro: String((e && e.message) || e) });
  }
};
