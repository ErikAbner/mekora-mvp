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

function hexCor(c) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return ("#" + h(c.r) + h(c.g) + h(c.b)).toUpperCase();
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
      if (solido) return { lum: luminancia(solido.color), no: n.name, hex: hexCor(solido.color) };
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

    let nasceu = false;
    if (!v) {
      v = figma.variables.createVariable(item.style, col, "COLOR");
      v.setValueForMode(modoId, { r: paint.color.r, g: paint.color.g, b: paint.color.b });
      nasceu = true;
    }
    v.scopes = item.escopos;

    // Liga o paint style à variável. setBoundVariableForPaint devolve um paint
    // NOVO — tem de ser capturado e reatribuído, senão nada acontece.
    const novo = figma.variables.setBoundVariableForPaint(paint, "color", v);
    ps.paints = [novo];

    const conferido = ps.paints[0].boundVariables && ps.paints[0].boundVariables.color;
    relato.push({
      style: item.style,
      estado: conferido
        ? (nasceu ? "variável criada e ligada" : "variável JÁ EXISTIA — reaproveitada, escopo reaplicado")
        : "FALHOU ao ligar",
      escopos: item.escopos,
      tocados: conferido ? 1 : 0,
    });
  }
  return relato;
}

// --- Ato 10 - os dois desvios que sobraram --------------------------------
//
// A DEC-0035 fixa entrelinha = corpo + 8, com UMA excecao escrita: o corpo 20
// de leitura fica em 30. Estes dois nao sao a excecao; sao defeito.
//
// Heading/XL a 48/48 tem delta ZERO. Num titulo de uma linha nao aparece, mas
// e o mesmo defeito do Ato 1: nasce invisivel e explode na primeira quebra.
// Label/Large a 18/28 esta 2 acima da regra, sem razao escrita em lugar nenhum.
//
// A DIFERENCA para o Ato 1: aqui a mudanca PODE ser visivel. Se algum no ja
// quebra em duas linhas, subir a entrelinha empurra o texto para baixo — que e
// justamente a correcao funcionando. Por isso este ato CONTA as multilinha e
// relata antes, em vez de prometer que nada muda.

const SOBRARAM = [
  { style: "Heading/XL",   de: 48, para: 56 },
  { style: "Label/Large",  de: 28, para: 26 },
];

async function corrigirSobras() {
  const relato = [];

  for (const item of SOBRARAM) {
    const achados = await acharStyle(item.style);
    if (achados.length !== 1) {
      relato.push({ style: item.style, estado: "esperava 1 style, achei " + achados.length + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const st = achados[0];
    const antes = st.lineHeight && st.lineHeight.value;
    if (antes !== item.de) {
      relato.push({ style: item.style, estado: "esperava " + item.de + ", achei " + antes + ". Nada foi tocado.", tocados: 0 });
      continue;
    }

    // Quantos nos usam, e quantos ja quebram linha. A altura de uma linha e
    // a entrelinha atual; acima disso, o no e multilinha.
    const usam = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] })
      .filter(function (n) { return n.textStyleId === st.id; });
    const multi = usam.filter(function (n) { return n.height > antes * 1.5; });

    await carregarFonte(st);
    st.lineHeight = px(item.para);

    const conferido = (await acharStyle(item.style))[0].lineHeight.value;
    relato.push({
      style: item.style,
      estado: conferido === item.para ? "aplicado" : "FALHOU ao conferir",
      antes: item.de,
      depois: conferido,
      corpo: st.fontSize,
      nos: usam.length,
      multilinha: multi.length,
      aparencia: multi.length === 0
        ? "nenhum no quebra linha: nada muda na tela"
        : multi.length + " no(s) quebram linha e VAO mudar de altura",
      tocados: usam.length,
    });
  }
  return relato;
}

// --- Ato 11 - diagnostico, sem escrever nada ------------------------------
//
// A medicao disse que surface/raised pinta 94 TEXTOS e surface/base pinta 2.
// Superficie usada como tinta. A hipotese e texto sobre fundo escuro, onde o
// #F3F4F7 da 18,26 de contraste e funciona — mas o NOME mente, e um nome que
// mente e o defeito que esta migracao inteira existiu para tirar.
//
// Este ato nao corrige: ele diz ONDE estao e sobre QUE fundo, para a decisao
// ser tomada com o caso na frente em vez de por hipotese.

async function diagnosticarSuperficieComoTinta() {
  const alvos = ["surface/raised", "surface/base", "surface/inverse"];
  const relato = [];

  for (const nome of alvos) {
    const estilos = await acharCor(nome);
    if (estilos.length !== 1) {
      relato.push({ style: nome, estado: "esperava 1, achei " + estilos.length });
      continue;
    }
    const id = estilos[0].id;
    const textos = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] })
      .filter(function (n) { return n.fillStyleId === id; });

    const porFundo = {};
    const exemplos = [];
    for (const n of textos) {
      const f = fundoDe(n);
      const chave = f ? f.hex + " (lum " + f.lum.toFixed(3) + ")" : "sem fundo solido encontrado";
      porFundo[chave] = (porFundo[chave] || 0) + 1;
      if (exemplos.length < 8) {
        exemplos.push({
          texto: n.characters.slice(0, 40),
          tela: telaDe(n),
          fundo: chave,
        });
      }
    }
    relato.push({ style: nome, textos_pintados: textos.length, por_fundo: porFundo, exemplos: exemplos });
  }
  return relato;
}

// Sobe pelos pais ate achar um quadro nomeado de topo — e a tela onde o no vive.
function telaDe(no) {
  let p = no.parent;
  let ultimo = null;
  while (p && p.type !== "PAGE") {
    ultimo = p.name;
    p = p.parent;
  }
  return ultimo || "?";
}

// --- Ato 12 - a tinta que se chamava superficie ---------------------------
//
// O Ato 11 mediu, e a hipotese estava certa: os 94 textos pintados com
// surface/raised estao TODOS sobre fundo escuro — 83 sobre #070808 e 11 sobre
// #000000. Os 2 de surface/base tambem. O contraste passa folgado nos dois
// casos (18,1 e 18,9), entao ninguem nunca viu problema. O defeito e o NOME.
//
// Um style chamado surface/ que pinta letra promete a coisa errada em todo
// seletor onde aparece, e e a razao de a variavel ter escopo: agora que
// surface/raised so aceita FRAME_FILL e SHAPE_FILL, o nome e o escopo estao
// dizendo coisas opostas sobre os mesmos 94 nos.
//
// UM valor para os 96, e nao dois. Os 94 usam #F3F4F7 e os 2 usam #FFFFFF
// para o mesmo trabalho — e duas tintas para um trabalho e exatamente o que
// esta migracao passou o dia inteiro desfazendo. Fica o #F3F4F7: e o off-white
// que o idioma do produto pede, e e o valor dos 94, nao dos 2.
//
// Os 2 nos MUDAM DE APARENCIA — de #FFFFFF para #F3F4F7 sobre preto, 21 para
// 18,9 de contraste. Imperceptivel, mas e mudanca, e vem relatada separada.

const TINTA_NO_ESCURO = {
  nome: "text/on-inverse",
  hex: "#F3F4F7",
  rgb: { r: 0xF3 / 255, g: 0xF4 / 255, b: 0xF7 / 255 },
  origens: ["surface/raised", "surface/base"],
};

async function tintaNoEscuro() {
  const relato = [];

  // Nao recriar se ja existe: rodar duas vezes nao pode dobrar nada.
  let alvos = await acharCor(TINTA_NO_ESCURO.nome);
  let estilo;
  if (alvos.length > 1) {
    return [{ estado: "ja existem " + alvos.length + " styles chamados " + TINTA_NO_ESCURO.nome + ". Nada foi tocado.", tocados: 0 }];
  }
  if (alvos.length === 1) {
    estilo = alvos[0];
    relato.push({ acao: "style", estado: "ja existia — reaproveitado", nome: TINTA_NO_ESCURO.nome });
  } else {
    estilo = figma.createPaintStyle();
    estilo.name = TINTA_NO_ESCURO.nome;
    estilo.paints = [{ type: "SOLID", color: TINTA_NO_ESCURO.rgb }];
    relato.push({ acao: "style", estado: "criado", nome: TINTA_NO_ESCURO.nome, valor: TINTA_NO_ESCURO.hex });
  }

  // A variavel, na mesma colecao e com o escopo de tinta de texto. Hoje o valor
  // e igual ao do surface/raised, e isso NAO e duplicata: sao dois papeis que
  // podem divergir no modo Escuro, e e para poderem divergir que existem dois.
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const col = cols.filter(function (c) { return c.name === "Mekora"; })[0];
  if (!col) {
    relato.push({ acao: "variavel", estado: "colecao Mekora nao encontrada. Style criado, variavel nao." });
  } else {
    let v = null;
    for (const id of col.variableIds) {
      const cand = await figma.variables.getVariableByIdAsync(id);
      if (cand && cand.name === TINTA_NO_ESCURO.nome) { v = cand; break; }
    }
    const nasceu = !v;
    if (!v) {
      v = figma.variables.createVariable(TINTA_NO_ESCURO.nome, col, "COLOR");
      v.setValueForMode(col.modes[0].modeId, TINTA_NO_ESCURO.rgb);
    }
    v.scopes = ["TEXT_FILL"];
    const novo = figma.variables.setBoundVariableForPaint(estilo.paints[0], "color", v);
    estilo.paints = [novo];
    const ok = estilo.paints[0].boundVariables && estilo.paints[0].boundVariables.color;
    relato.push({
      acao: "variavel",
      estado: ok ? (nasceu ? "criada e ligada" : "ja existia — religada") : "FALHOU ao ligar",
      escopos: ["TEXT_FILL"],
    });
  }

  // Mover os nos. So os que estao COMPROVADAMENTE sobre fundo escuro: se algum
  // texto com surface/raised estiver sobre fundo claro, e outro problema, e
  // mover as cegas trocaria um defeito por outro invisivel.
  const todos = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] });
  for (const origem of TINTA_NO_ESCURO.origens) {
    const achados = await acharCor(origem);
    if (achados.length !== 1) {
      relato.push({ de: origem, estado: "esperava 1 style, achei " + achados.length + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const antesHex = hexDe(achados[0]);
    const usam = todos.filter(function (n) { return n.fillStyleId === achados[0].id; });

    const movidos = [];
    const noClaro = [];
    for (const n of usam) {
      const f = fundoDe(n);
      if (!f || f.lum >= 0.18) {
        noClaro.push({ texto: n.characters.slice(0, 40), tela: telaDe(n), fundo: f ? f.hex : "nenhum" });
        continue;
      }
      await n.setFillStyleIdAsync(estilo.id);
      movidos.push(n.id);
    }
    relato.push({
      de: origem,
      valor_antes: antesHex,
      valor_depois: TINTA_NO_ESCURO.hex,
      movidos: movidos.length,
      recusados_por_fundo_claro: noClaro.length,
      detalhe_recusados: noClaro.slice(0, 6),
      aparencia: antesHex === TINTA_NO_ESCURO.hex
        ? "mesmo valor: nada muda na tela"
        : movidos.length + " no(s) mudam de " + antesHex + " para " + TINTA_NO_ESCURO.hex,
      tocados: movidos.length,
    });
  }

  // O achado de borda do Ato 11: existe preto puro como fundo, e o sistema nao
  // tem preto puro. Contado, nao corrigido — sao quadros, nao texto, e mexer
  // em superficie e outro risco.
  const pretos = figma.currentPage.findAllWithCriteria({ types: ["FRAME", "RECTANGLE", "COMPONENT", "INSTANCE"] })
    .filter(function (n) {
      const f = n.fills;
      if (!Array.isArray(f) || !f.length) return false;
      const solido = f.filter(function (x) { return x.type === "SOLID" && x.visible !== false; }).pop();
      return solido && hexCor(solido.color) === "#000000";
    });
  relato.push({
    achado: "fundos em preto puro",
    quantos: pretos.length,
    telas: pretos.slice(0, 8).map(function (n) { return telaDe(n) + " / " + n.name; }),
    nota: "o sistema nao tem #000000: surface/inverse e #070808. Nao corrigido aqui — sao superficies, nao texto.",
  });

  return relato;
}

// --- Ato 13 - a reconciliacao ---------------------------------------------
//
// A decisao do Erik em 29/08: base preta e branca NEUTRA, e cor so em tres
// enderecos — nota, capa de livro, estado do sistema.
//
// Havia duas paletas base e elas nao concordavam. A regra desta reconciliacao,
// escrita para poder ser conferida depois:
//
//   mantem a ESTRUTURA e a LUMINANCIA da paleta quente, e tira o matiz.
//
// A quente e a que foi medida (196 pares, AA 4,5 adotado), a que tem tres
// degraus de superficie, estados e tema escuro. A do Figma tem os NOMES certos
// — por papel, com escopo, ligados a mil e poucos nos. Cada uma tinha metade.
//
// E a medicao decidiu um detalhe que ninguem tinha olhado: NENHUM valor do
// Figma e neutro. Todos puxam para o azul — #F3F4F7, #D2D3D6, ate o #0C0D0D.
// "Preto e branco neutro" aponta para o conjunto neutralizado, nao para eles.
// O --ink quente, por sinal, ja era #151515: neutro puro desde sempre.
//
// DOIS NOMES MUDAM, e nao e cosmetico. `surface/raised` e MAIS ESCURO que o
// `surface/base` — um nome que promete relevo e entrega profundidade. Na regra
// do produto as camadas vem do fundo, nunca da borda, entao elas descem. Vira
// `surface/sunken`, e o terceiro degrau que faltava entra como `surface/deep`.

function rgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// de: o que a medicao registrou hoje. Se nao bater, o ato para e conta.
const RECONCILIACAO = [
  { style: "text/strong",     de: "#0C0D0D", para: "#151515", escopos: ["TEXT_FILL"] },
  { style: "text/primary",    de: "#323233", para: "#535353", escopos: ["TEXT_FILL"] },
  { style: "text/secondary",  de: "#666668", para: "#6A6A6A", escopos: ["TEXT_FILL"] },
  { style: "icon/default",    de: "#727274", para: "#6A6A6A", escopos: ["SHAPE_FILL", "STROKE_COLOR"] },
  { style: "border/subtle",   de: "#D2D3D6", para: "#B1B1B1", escopos: ["STROKE_COLOR"] },
  { style: "surface/base",    de: "#FFFFFF", para: "#F9F9F9", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { style: "surface/raised",  de: "#F3F4F7", para: "#F3F3F3", escopos: ["FRAME_FILL", "SHAPE_FILL"], renomear: "surface/sunken" },
  { style: "surface/inverse", de: "#070808", para: "#161616", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { style: "text/on-inverse", de: "#F3F4F7", para: "#F3F3F3", escopos: ["TEXT_FILL"] },
];

// Nascem agora. Os tres enderecos onde a cor tem permissao, mais o degrau de
// superficie que faltava.
const NOVAS = [
  { nome: "surface/deep", hex: "#EBEBEB", escopos: ["FRAME_FILL", "SHAPE_FILL"] },

  // nota: marca pequena, precisa ser vista. Conjunto `vivo`, o de maior croma
  // (109) e maior contraste contra o papel (1,66 a 1,75 de media).
  { nome: "nota/verde",   hex: "#D7F285", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "nota/rosa",    hex: "#F28587", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "nota/amarelo", hex: "#F2E685", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "nota/azul",    hex: "#85BCF2", escopos: ["FRAME_FILL", "SHAPE_FILL"] },

  // capa: area grande, pode ser sutil. Conjunto `claro`, que a 1,01 nao serve
  // de marca — mas uma capa inteira tingida se le mesmo fraca.
  { nome: "capa/verde",   hex: "#EFFFBF", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "capa/rosa",    hex: "#FFBFC0", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "capa/amarelo", hex: "#FFF8BF", escopos: ["FRAME_FILL", "SHAPE_FILL"] },
  { nome: "capa/azul",    hex: "#BFDFFF", escopos: ["FRAME_FILL", "SHAPE_FILL"] },

  // estado: tinta, nao superficie. Vem da paleta quente e NAO e neutralizado —
  // estado sem cor nao e estado.
  { nome: "estado/ok",      hex: "#2F7D55", escopos: ["TEXT_FILL", "SHAPE_FILL"] },
  { nome: "estado/atencao", hex: "#976519", escopos: ["TEXT_FILL", "SHAPE_FILL"] },
  { nome: "estado/perigo",  hex: "#B23B2A", escopos: ["TEXT_FILL", "SHAPE_FILL"] },
];

async function reconciliar() {
  const relato = [];
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const col = cols.filter(function (c) { return c.name === "Mekora"; })[0];
  if (!col) return [{ estado: "colecao Mekora nao encontrada. Nada foi tocado.", tocados: 0 }];
  const modoId = col.modes[0].modeId;

  const porNome = {};
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) porNome[v.name] = v;
  }

  // 1 · trocar o valor dos nove que existem, pela VARIAVEL. E o retorno de ter
  // feito variavel antes: um setValueForMode chega em todo no que usa o style.
  for (const item of RECONCILIACAO) {
    const estilos = await acharCor(item.style);
    if (estilos.length !== 1) {
      relato.push({ style: item.style, estado: "esperava 1 style, achei " + estilos.length + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const antes = hexDe(estilos[0]);
    if (antes !== item.de) {
      relato.push({ style: item.style, estado: "esperava " + item.de + ", achei " + antes + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const v = porNome[item.style];
    if (!v) {
      relato.push({ style: item.style, estado: "sem variavel ligada. Nada foi tocado.", tocados: 0 });
      continue;
    }
    v.setValueForMode(modoId, rgb(item.para));
    v.scopes = item.escopos;
    if (item.renomear) {
      v.name = item.renomear;
      estilos[0].name = item.renomear;
    }
    const depois = hexDe((await acharCor(item.renomear || item.style))[0]);
    relato.push({
      style: item.renomear ? item.style + " -> " + item.renomear : item.style,
      de: item.de, para: item.para, conferido: depois,
      estado: depois === item.para ? "aplicado" : "FALHOU ao conferir",
      tocados: depois === item.para ? 1 : 0,
    });
  }

  // 2 · criar as treze que nascem agora, cada uma com style E variavel ligada.
  for (const nova of NOVAS) {
    const jah = await acharCor(nova.nome);
    if (jah.length) {
      relato.push({ novo: nova.nome, estado: "ja existia — nada foi criado", tocados: 0 });
      continue;
    }
    const ps = figma.createPaintStyle();
    ps.name = nova.nome;
    ps.paints = [{ type: "SOLID", color: rgb(nova.hex) }];

    let v = porNome[nova.nome];
    if (!v) {
      v = figma.variables.createVariable(nova.nome, col, "COLOR");
      v.setValueForMode(modoId, rgb(nova.hex));
    }
    v.scopes = nova.escopos;
    ps.paints = [figma.variables.setBoundVariableForPaint(ps.paints[0], "color", v)];

    const ok = ps.paints[0].boundVariables && ps.paints[0].boundVariables.color;
    relato.push({
      novo: nova.nome, valor: nova.hex, escopos: nova.escopos,
      estado: ok ? "style e variavel criados e ligados" : "FALHOU ao ligar",
      tocados: ok ? 1 : 0,
    });
  }

  relato.push({
    regra: "tinta de estado nao pousa em surface/deep",
    porque: "estado/ok da 4,21 la, estado/atencao 4,20 — os dois abaixo de 4,5. " +
            "Escurecer os tres para atender uma combinacao que nenhuma tela faz " +
            "embaçaria o estado inteiro. A regra custa menos que o conserto.",
  });
  return relato;
}

// --- Ato 14 - a escala tipografica, sem escrever nada ---------------------
//
// A cor ja foi reconciliada. A tipografia nao: os 16 styles do Figma nunca
// foram comparados com a escala do Prototipo de Produto, e ja se sabe que elas
// discordam em pelo menos um ponto — o corpo de leitura e 20 num e 18,56 no
// outro.
//
// Este ato so mede. A reconciliacao de cor so foi honesta porque a comparacao
// veio antes da proposta, e citar de memoria e o erro que ja custou uma rodada
// nesta sessao: os numeros 48/48 e 18/28 vinham de uma auditoria de dois dias
// antes e ja eram falsos.

async function escalaTipografica() {
  const styles = await figma.getLocalTextStylesAsync();
  const nos = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] });

  const uso = {};
  for (const n of nos) uso[n.textStyleId] = (uso[n.textStyleId] || 0) + 1;

  const linhas = styles.map(function (st) {
    const lh = st.lineHeight;
    const entre = lh && lh.unit === "PIXELS" ? lh.value
                : lh && lh.unit === "PERCENT" ? Math.round(st.fontSize * lh.value / 100)
                : null;
    const ls = st.letterSpacing;
    return {
      nome: st.name,
      corpo: st.fontSize,
      entre: entre,
      delta: entre === null ? null : Math.round((entre - st.fontSize) * 10) / 10,
      razao: entre === null ? null : Math.round(entre / st.fontSize * 100) / 100,
      peso: st.fontName.style,
      familia: st.fontName.family,
      tracking: ls ? (ls.unit === "PERCENT" ? ls.value + "%" : ls.value + "px") : "0",
      nos: uso[st.id] || 0,
    };
  });

  linhas.sort(function (a, b) { return b.corpo - a.corpo; });

  // A DEC-0035 fixa entrelinha = corpo + 8, com UMA excecao escrita: o corpo 20
  // de leitura fica em 30. Quem foge disso aparece nomeado, nao contado.
  const foraDaRegra = linhas.filter(function (l) {
    if (l.delta === null) return true;
    if (l.corpo === 20 && l.entre === 30) return false;
    return l.delta !== 8;
  }).map(function (l) { return l.nome + " " + l.corpo + "/" + l.entre + " (delta " + l.delta + ")"; });

  return [{
    total: linhas.length,
    nos_com_style: nos.filter(function (n) { return n.textStyleId; }).length,
    nos_sem_style: nos.filter(function (n) { return !n.textStyleId; }).length,
    familias: Array.from(new Set(linhas.map(function (l) { return l.familia; }))),
    fora_da_regra_corpo_mais_8: foraDaRegra,
    escala: linhas,
  }];
}

// --- Ato 15 - a tipografia: conserto, relato e os dois modos ---------------
//
// O Erik: "melhorar tudo depois nao significa descaso agora". Entao este ato
// separa o que se conserta com certeza do que precisa do olho dele, e nao
// mistura os dois. Aplicar no escuro seria o descaso.
//
// CONSERTA (A): o tracking esta ABSOLUTO onde deveria ser RELATIVO. O mesmo
// -1.6px vale -2,5% num corpo 64 e -6,7% num corpo 24 — invertido, porque tipo
// grande precisa de MAIS aperto, nao menos. E o mobile piora: a 32px o mesmo
// valor vira -5%. Convertido para porcentagem, com a curva na direcao certa.
//
// So os cinco que JA TEM tracking sao tocados. O Heading/MD e o Heading/SM
// estao em zero e continuam: dar tracking a quem nao tem e inventar curva
// nova, e isso e trabalho do DS e do playbook, com o olho junto.
//
// CONSERTA (B): o Label/Small/Caps em 20/24 e o unico fora do corpo + 8.
// Entrelinha vai para 28. O tracking dele — 23,8px, ou +119% do corpo — NAO e
// tocado: pode ser recurso editorial de proposito, e 119% e absurdo o bastante
// para merecer o olho antes da mao. O ato relata o texto dos dois nos.
//
// SO RELATA (C): Body/Medium/Prosa tem metrica identica ao Body/Medium — 20/30
// Regular, mesmo tracking, 12 nos contra 448. Parece duplicata, mas "Prosa"
// pode ser a prosa de leitura, que um dia diverge do corpo de interface. O ato
// diz ONDE os 12 vivem, e a absorcao fica para depois de olhar.
//
// CONSTROI (D): a colecao de tipografia com dois modos, Desktop e Mobile. A
// escala mobile foi derivada de uma curva log-linear ancorada em 20 -> 18, com
// piso em 18: nada abaixo do corpo encolhe, porque diminuir texto pequeno
// justamente na tela menor e o sinal invertido.

const TRACKING = [
  { style: "Display/Large",           de: -1.6, para: -2.5 },
  { style: "Display/Large/Capitular", de: -1.6, para: -2.5 },
  { style: "Heading/XL",              de: -1.6, para: -2.0 },
  { style: "Heading/LG",              de: -1.6, para: -1.5 },
  { style: "Heading/XS/Italic",       de: -1.6, para:  0.0 },
];

// corpo e entrelinha nos dois modos. A entrelinha segue corpo + 8, com a
// excecao escrita da DEC-0035 atravessando como RAZAO e nao como numero:
// o corpo de leitura fica em 1,5, entao 20/30 no desktop vira 18/27 no mobile.
const ESCALA = [
  { style: "Display/Large",           d: [64, 72], m: [40, 48] },
  { style: "Display/Large/Capitular", d: [64, 72], m: [40, 48] },
  { style: "Heading/XL",              d: [48, 56], m: [32, 40] },
  { style: "Heading/LG",              d: [40, 48], m: [28, 36] },
  { style: "Heading/MD",              d: [32, 40], m: [24, 32] },
  { style: "Heading/SM",              d: [28, 36], m: [22, 30] },
  { style: "Heading/XS",              d: [24, 32], m: [20, 28] },
  { style: "Heading/XS/Italic",       d: [24, 32], m: [20, 28] },
  { style: "Body/Large",              d: [24, 32], m: [20, 28] },
  { style: "Body/Medium",             d: [20, 30], m: [18, 27] },
  { style: "Body/Medium/Prosa",       d: [20, 30], m: [18, 27] },
  { style: "Label/Small/Caps",        d: [20, 28], m: [18, 26] },
  { style: "Label/Large",             d: [18, 26], m: [18, 26] },
  { style: "Body/Small",              d: [16, 24], m: [16, 24] },
  { style: "Label/Medium",            d: [16, 24], m: [16, 24] },
  { style: "Label/Small",             d: [14, 22], m: [14, 22] },
];

function chave(nome) {
  return nome.toLowerCase().replace(/\//g, "-");
}

async function acharTexto(nome) {
  const todos = await figma.getLocalTextStylesAsync();
  return todos.filter(function (s) { return s.name === nome; });
}

async function tipografia() {
  const relato = [];
  const nos = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] });

  // A · tracking absoluto vira relativo
  for (const t of TRACKING) {
    const achados = await acharTexto(t.style);
    if (achados.length !== 1) {
      relato.push({ style: t.style, estado: "esperava 1, achei " + achados.length + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const st = achados[0];
    const ls = st.letterSpacing;
    if (!ls || ls.unit !== "PIXELS" || Math.abs(ls.value - t.de) > 0.01) {
      relato.push({ style: t.style, estado: "esperava " + t.de + "px, achei " + (ls ? ls.value + ls.unit : "nada") + ". Nada foi tocado.", tocados: 0 });
      continue;
    }
    const emAntes = Math.round(t.de / st.fontSize * 1000) / 10;
    await carregarFonte(st);
    st.letterSpacing = { unit: "PERCENT", value: t.para };
    relato.push({
      style: t.style, corpo: st.fontSize,
      antes: t.de + "px (" + emAntes + "%)", depois: t.para + "%",
      estado: "tracking agora e relativo", tocados: 1,
    });
  }

  // B · Label/Small/Caps: entrelinha entra na regra, tracking fica para o olho
  const caps = await acharTexto("Label/Small/Caps");
  if (caps.length === 1) {
    const st = caps[0];
    const antes = st.lineHeight && st.lineHeight.value;
    const textos = nos.filter(function (n) { return n.textStyleId === st.id; })
                      .map(function (n) { return n.characters.slice(0, 40) + "  [" + telaDe(n) + "]"; });
    if (antes === 24) {
      await carregarFonte(st);
      st.lineHeight = px(28);
    }
    relato.push({
      style: "Label/Small/Caps",
      entrelinha: antes === 24 ? "24 -> 28, entra na regra corpo + 8" : "esperava 24, achei " + antes + ". Nao tocada.",
      tracking_NAO_tocado: st.letterSpacing.value + (st.letterSpacing.unit === "PIXELS" ? "px" : "%") +
        " = " + Math.round(st.letterSpacing.value / st.fontSize * 1000) / 10 + "% do corpo",
      porque: "119% e mais que um caractere inteiro entre letras. Pode ser recurso editorial de proposito. Olha os nos antes:",
      nos: textos,
      tocados: antes === 24 ? 1 : 0,
    });
  }

  // C · onde vivem os 12 do Prosa — so relato
  const prosa = await acharTexto("Body/Medium/Prosa");
  if (prosa.length === 1) {
    const usam = nos.filter(function (n) { return n.textStyleId === prosa[0].id; });
    relato.push({
      style: "Body/Medium/Prosa",
      estado: "NAO absorvido — so localizado",
      porque: "metrica identica ao Body/Medium (20/30 Regular), mas 'Prosa' pode ser a prosa de leitura, " +
              "que um dia diverge do corpo de interface. Absorver seria decidir isso sem olhar.",
      nos: usam.map(function (n) { return n.characters.slice(0, 44) + "  [" + telaDe(n) + "]"; }),
      tocados: 0,
    });
  }

  // D · a colecao com os dois modos
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  let col = cols.filter(function (c) { return c.name === "Mekora Tipografia"; })[0];
  let mDesk, mMob;
  if (!col) {
    col = figma.variables.createVariableCollection("Mekora Tipografia");
    mDesk = col.modes[0].modeId;
    col.renameMode(mDesk, "Desktop");
    mMob = col.addMode("Mobile");
    relato.push({ acao: "colecao", estado: "criada com os modos Desktop e Mobile", nome: "Mekora Tipografia" });
  } else {
    mDesk = (col.modes.filter(function (m) { return m.name === "Desktop"; })[0] || col.modes[0]).modeId;
    const mm = col.modes.filter(function (m) { return m.name === "Mobile"; })[0];
    mMob = mm ? mm.modeId : col.addMode("Mobile");
    relato.push({ acao: "colecao", estado: "reaproveitada", nome: col.name });
  }

  const porNome = {};
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) porNome[v.name] = v;
  }

  let ligados = 0, falhou = [];
  for (const item of ESCALA) {
    const achados = await acharTexto(item.style);
    if (achados.length !== 1) { falhou.push(item.style + " (nao encontrado)"); continue; }
    const st = achados[0];
    const k = chave(item.style);

    for (const campo of [["corpo", "fontSize", 0], ["entre", "lineHeight", 1]]) {
      const nome = campo[0] + "/" + k;
      let v = porNome[nome];
      if (!v) {
        v = figma.variables.createVariable(nome, col, "FLOAT");
        porNome[nome] = v;
      }
      v.setValueForMode(mDesk, item.d[campo[2]]);
      v.setValueForMode(mMob, item.m[campo[2]]);
      v.scopes = campo[0] === "corpo" ? ["FONT_SIZE"] : ["LINE_HEIGHT"];
      try {
        st.setBoundVariable(campo[1], v);
        ligados++;
      } catch (e) {
        falhou.push(item.style + " " + campo[1] + ": " + e.message);
      }
    }
  }

  relato.push({
    acao: "escala nos dois modos",
    variaveis: ESCALA.length * 2,
    ligacoes_ok: ligados,
    falhas: falhou,
    piso: "18 — nada abaixo do corpo encolhe no mobile",
    entrelinha: "corpo + 8, com a leitura atravessando como razao 1,5: 20/30 vira 18/27",
  });

  return relato;
}

// --- Ato 16 - os 392 sem style ---------------------------------------------
//
// O Ato 14 contou 392 nos de texto sem style nenhum, 18% dos 2.160, e contar
// foi tudo o que ele fez. Isso importa antes do fork do prismsystem: ele deriva
// o sistema de tokens da fonte que recebe, e 392 valores soltos ou viram ruido
// ou somem. Se forem exploracao mobile, otimo — ignora. Se tiver producao ali,
// o Design System nasce com buraco e ninguem descobre ate doer.
//
// Este ato NAO escreve. Ele classifica cada no em tres baldes, e a diferenca
// entre eles e o que decide o trabalho:
//
//   ADOTAVEL  a metrica bate EXATAMENTE com um style que ja existe. E so um no
//             que nunca foi ligado. Ligar e mecanico e invisivel.
//   QUASE     esta a 1px de um style. Provavelmente e o mesmo, digitado a mao.
//   ORFAO     nao bate com nada. Ou e valor novo de proposito, e entao merece
//             style, ou e acidente — e so o olho decide qual.
//
// Conta tambem os nos MISTOS, que o Ato 14 nao viu: um no com mais de um style
// dentro devolve figma.mixed, que e um simbolo e portanto verdadeiro, entao ele
// foi contado como "tem style". Se existirem, sao um terceiro caso.

function valorDe(no) {
  const m = figma.mixed;
  if (no.fontSize === m || no.fontName === m || no.lineHeight === m) return null;
  const lh = no.lineHeight;
  const entre = lh.unit === "PIXELS" ? lh.value
              : lh.unit === "PERCENT" ? Math.round(no.fontSize * lh.value / 100)
              : "auto";
  return { corpo: no.fontSize, entre: entre, peso: no.fontName.style };
}

function assina(v) {
  return v ? v.corpo + "/" + v.entre + " " + v.peso : "misto";
}

async function semStyle() {
  const styles = await figma.getLocalTextStylesAsync();
  const catalogo = styles.map(function (st) {
    const lh = st.lineHeight;
    return {
      nome: st.name,
      corpo: st.fontSize,
      entre: lh && lh.unit === "PIXELS" ? lh.value : null,
      peso: st.fontName.style,
    };
  });

  const todos = figma.currentPage.findAllWithCriteria({ types: ["TEXT"] });
  const mistos = todos.filter(function (n) { return n.textStyleId === figma.mixed; });
  const nus = todos.filter(function (n) { return n.textStyleId === ""; });

  const baldes = { adotavel: {}, quase: {}, orfao: {} };
  const porTela = {};
  const semValor = [];

  for (const n of nus) {
    const v = valorDe(n);
    const tela = telaDe(n);
    porTela[tela] = (porTela[tela] || 0) + 1;
    if (!v) { semValor.push(tela); continue; }

    // exato: corpo, entrelinha e peso iguais
    const exato = catalogo.filter(function (c) {
      return c.corpo === v.corpo && c.entre === v.entre && c.peso === v.peso;
    })[0];
    // quase: mesmo peso, corpo e entrelinha a 1px
    const perto = exato ? null : catalogo.filter(function (c) {
      return c.peso === v.peso && Math.abs(c.corpo - v.corpo) <= 1 &&
             c.entre !== null && Math.abs(c.entre - v.entre) <= 1;
    })[0];

    const balde = exato ? "adotavel" : perto ? "quase" : "orfao";
    const chave = assina(v) + (exato ? "  ->  " + exato.nome : perto ? "  ~  " + perto.nome : "");
    if (!baldes[balde][chave]) baldes[balde][chave] = { nos: 0, telas: {}, exemplo: n.characters.slice(0, 40) };
    baldes[balde][chave].nos++;
    baldes[balde][chave].telas[tela] = (baldes[balde][chave].telas[tela] || 0) + 1;
  }

  function arruma(b) {
    return Object.keys(b).map(function (k) {
      return { valor: k, nos: b[k].nos, telas: Object.keys(b[k].telas).slice(0, 5), exemplo: b[k].exemplo };
    }).sort(function (a, c) { return c.nos - a.nos; });
  }

  const totalBalde = function (b) {
    return Object.keys(b).reduce(function (a, k) { return a + b[k].nos; }, 0);
  };

  return [{
    sem_style: nus.length,
    mistos: mistos.length,
    nota_mistos: mistos.length
      ? "nos com mais de um style dentro. O Ato 14 os contou como 'tem style' porque figma.mixed e um simbolo, e simbolo e verdadeiro."
      : "nenhum — o Ato 14 nao tinha essa cegueira neste arquivo.",
    resumo: {
      adotavel: totalBalde(baldes.adotavel),
      quase: totalBalde(baldes.quase),
      orfao: totalBalde(baldes.orfao),
      sem_valor_legivel: semValor.length,
    },
    por_tela: Object.keys(porTela).map(function (t) { return { tela: t, nos: porTela[t] }; })
                    .sort(function (a, b) { return b.nos - a.nos; }).slice(0, 15),
    adotavel: arruma(baldes.adotavel),
    quase: arruma(baldes.quase),
    orfao: arruma(baldes.orfao),
  }];
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
    else if (msg.tipo === "sobras") relato = await corrigirSobras();
    else if (msg.tipo === "diagnostico") relato = await diagnosticarSuperficieComoTinta();
    else if (msg.tipo === "tinta-escuro") relato = await tintaNoEscuro();
    else if (msg.tipo === "reconciliar") relato = await reconciliar();
    else if (msg.tipo === "escala") relato = await escalaTipografica();
    else if (msg.tipo === "tipografia") relato = await tipografia();
    else if (msg.tipo === "sem-style") relato = await semStyle();
    else relato = [{ estado: "ação desconhecida" }];

    figma.ui.postMessage({ ok: true, relato });
  } catch (e) {
    figma.ui.postMessage({ ok: false, erro: String((e && e.message) || e) });
  }
};
