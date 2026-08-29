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

// ─── Ligação com a interface ───────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  try {
    let relato;
    if (msg.tipo === "entrelinha") relato = await corrigirEntrelinha();
    else if (msg.tipo === "h5-valor") relato = await corrigirH5("valor");
    else if (msg.tipo === "h5-absorver") relato = await corrigirH5("absorver");
    else if (msg.tipo === "kindle") relato = await corrigirContadorKindle();
    else relato = [{ estado: "ação desconhecida" }];

    figma.ui.postMessage({ ok: true, relato });
  } catch (e) {
    figma.ui.postMessage({ ok: false, erro: String((e && e.message) || e) });
  }
};
