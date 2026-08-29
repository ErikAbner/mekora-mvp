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
    else relato = [{ estado: "ação desconhecida" }];

    figma.ui.postMessage({ ok: true, relato });
  } catch (e) {
    figma.ui.postMessage({ ok: false, erro: String((e && e.message) || e) });
  }
};
