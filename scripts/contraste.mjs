// Mede o contraste de toda tinta contra toda superfície, nos dois temas.
//
// Por que existe: o item 3 da Fase 0 do plano de implementação pede a
// arquitetura de três camadas "com o valor de cada par medido em contraste
// sobre a superfície que o nome promete". Isso foi feito uma vez, em 29/08,
// sobre a paleta do arquivo de WIREFRAME — que não é a do produto. A do
// produto vive aqui, no Protótipo de Produto, e nunca passou por isso.
//
// Ele LÊ o protótipo, não uma cópia da paleta. Tabela copiada à mão envelhece
// no primeiro ajuste, e uma medição que envelhece em silêncio é pior que
// nenhuma — foi exatamente o que aconteceu com os números 48/48 e 18/28, que
// vieram de uma auditoria de dois dias antes e já eram falsos quando citados.
//
//     node scripts/contraste.mjs
//     node scripts/contraste.mjs --so-falhas
//
// Regra de leitura: AA pede 4,5 para texto normal, 3,0 para texto grande
// (>= 24px, ou >= 18,66px em negrito) e 3,0 para o que não é texto — borda,
// ícone, traço. O script diz o número; quem decide se o par é legítimo é
// quem sabe onde ele é usado.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTE = join(raiz, "prototipo-mesa.html");

// ─── Cor ───────────────────────────────────────────────────────────────────

function hexParaRgb(h) {
  const s = h.replace("#", "").trim();
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function hslParaRgb(hDeg, sPct, lPct) {
  const h = hDeg / 360, s = sPct / 100, l = lPct / 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map((v) => Math.round(v * 255));
}

// Devolve { rgb, alfa }. Alfa < 1 significa que a cor NÃO é absoluta: ela só
// vira número depois de composta sobre a superfície de baixo.
function lerCor(v) {
  const t = v.trim();
  let m;
  if (t.startsWith("#")) return { rgb: hexParaRgb(t), alfa: 1 };
  if ((m = t.match(/^rgba?\(([^)]+)\)/i))) {
    const p = m[1].split(/[,/]/).map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], alfa: p.length > 3 ? p[3] : 1 };
  }
  if ((m = t.match(/^hsla?\(([^)]+)\)/i))) {
    const p = m[1].split(/[,/]/).map((x) => parseFloat(x));
    return { rgb: hslParaRgb(p[0], p[1], p[2]), alfa: p.length > 3 ? p[3] : 1 };
  }
  return null;
}

function compor(frente, fundo) {
  if (frente.alfa >= 1) return frente.rgb;
  return frente.rgb.map((c, i) => Math.round(c * frente.alfa + fundo[i] * (1 - frente.alfa)));
}

function luminancia([r, g, b]) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function razao(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function hex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ─── Leitura do protótipo ──────────────────────────────────────────────────
//
// Só os dois blocos que são tema: `:root{...}` e `:root[data-tema="escuro"]`.
// Os blocos [data-raio] e [data-fundo] ficam de fora de propósito — o próprio
// protótipo os declara como "comparação ao vivo, para julgar com o olho", e
// comparador não é paleta.

function blocos(css) {
  const claro = css.match(/:root\{([\s\S]*?)\n\}/);
  const escuro = css.match(/:root\[data-tema="escuro"\]\{([\s\S]*?)\n\}/);
  if (!claro) throw new Error("bloco :root nao encontrado em " + FONTE);
  if (!escuro) throw new Error('bloco :root[data-tema="escuro"] nao encontrado em ' + FONTE);
  return { claro: claro[1], escuro: escuro[1] };
}

function tokens(bloco) {
  const fora = {};
  // Comentário some antes: ele contém `--nome  valor` em prosa, e isso vira
  // token fantasma se for lido junto.
  const limpo = bloco.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of limpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) {
    const cor = lerCor(m[2]);
    if (cor) fora[m[1]] = cor;
  }
  return fora;
}

// ─── Os papéis ─────────────────────────────────────────────────────────────

// O minimo depende do PAPEL, e nem todo papel tem minimo.
//
// A WCAG cobra 3,0 de componente de interface e de objeto grafico necessario
// para entender o conteudo — nao de separador decorativo. Cobrar 3,0 de um
// filete produz uma lista de "falhas" onde a maioria nao e falha, e uma lista
// assim vira ruido: quem a le uma vez para de ler.
//
// O --ink-4 tambem nao tem minimo de texto, e nao por concessao: o CLAUDE.md
// deste repositorio ja decidiu que ele e "proibido em texto, so borda e ponto".
// Medir contra 4,5 seria medir contra um uso que a regra proibe.
//
// `minimo: null` significa: mede, mostra o numero, nao julga. O numero ainda
// importa — filete invisivel e defeito de desenho —, mas quem julga isso e o
// olho, e o criterio nao e a WCAG.
const TINTAS = [
  { chave: "--ink", papel: "tinta cheia", minimo: 4.5 },
  { chave: "--ink-2", papel: "tinta secundaria", minimo: 4.5 },
  { chave: "--ink-3", papel: "tinta terciaria", minimo: 4.5 },
  { chave: "--acc", papel: "acento", minimo: 4.5 },
  { chave: "--ok", papel: "estado ok", minimo: 4.5 },
  { chave: "--warn", papel: "estado atencao", minimo: 4.5 },
  { chave: "--dan", papel: "estado perigo", minimo: 4.5 },
  { chave: "--ink-4", papel: "so borda e ponto (CLAUDE.md: proibido em texto)", minimo: null },
  { chave: "--line", papel: "filete decorativo", minimo: null },
  { chave: "--line-2", papel: "filete fraco", minimo: null },
  { chave: "--line-3", papel: "filete forte", minimo: null },
];

// Texto grande — >= 24px, ou >= 18,66px em negrito — pede 3,0 e nao 4,5.
// Na escala do protótipo isso e --t-h2 (24px), --t-h1 (34,4px) e --t-display.
// Um par entre 3,0 e 4,5 nao e falha universal: e "so serve em titulo".
const AA_GRANDE = 3.0;

const SUPERFICIES = ["--bg", "--bg-2", "--bg-3", "--nav", "--branco", "--paper", "--acc-soft", "--ok-soft", "--warn-soft", "--dan-soft"];

// Pares que a paleta cria mas que ninguém usa: tinta de estado sobre o macio
// de OUTRO estado. Medir todos e listar 110 linhas esconde as que importam.
function parLegitimo(tinta, sup) {
  const est = ["--ok", "--warn", "--dan", "--acc"];
  const macio = ["--ok-soft", "--warn-soft", "--dan-soft", "--acc-soft"];
  if (!macio.includes(sup)) return true;
  const dono = sup.replace("-soft", "");
  return !est.includes(tinta) || tinta === dono;
}

// ─── Relatório ─────────────────────────────────────────────────────────────

const soFalhas = process.argv.includes("--so-falhas");
const css = readFileSync(FONTE, "utf8");
const b = blocos(css);

let falhas = 0, parciais = 0, medidos = 0;

for (const [tema, bloco] of [["CLARO", b.claro], ["ESCURO", b.escuro]]) {
  const t = tokens(bloco);
  console.log("\n" + "=".repeat(72));
  console.log("TEMA " + tema);
  if (tema === "ESCURO") {
    console.log("  O proprio prototipo marca este tema como provisorio:");
    console.log('  "o escuro nao segue o sistema: um prototipo de revisao abre na');
    console.log('   paleta que esta sendo decidida."');
  }
  console.log("=".repeat(72));

  for (const { chave, papel, minimo } of TINTAS) {
    const tinta = t[chave];
    if (!tinta) { console.log(`\n${chave} — ausente neste tema`); continue; }
    const linhas = [];
    for (const s of SUPERFICIES) {
      const sup = t[s];
      if (!sup || !parLegitimo(chave, s)) continue;
      const fundo = sup.alfa >= 1 ? sup.rgb : compor(sup, t["--bg"].rgb);
      const frente = compor(tinta, fundo);
      const r = razao(frente, fundo);
      medidos++;

      let veredito;
      if (minimo === null) {
        veredito = "— sem minimo: papel decorativo";
      } else if (r >= minimo) {
        veredito = "ok";
      } else if (r >= AA_GRANDE) {
        veredito = `so em texto grande (${r.toFixed(2)} < ${minimo.toFixed(1)}, >= 3,0)`;
        parciais++;
      } else {
        veredito = `FALHA (pede ${minimo.toFixed(1)})`;
        falhas++;
      }

      const limpo = minimo === null || r >= minimo;
      if (soFalhas && limpo) continue;
      linhas.push(`  ${s.padEnd(12)} ${hex(fundo)}  ${r.toFixed(2).padStart(6)}  ${veredito}`);
    }
    if (linhas.length) {
      const rotulo = minimo === null ? "sem minimo" : `pede ${minimo.toFixed(1)}`;
      console.log(`\n${chave}  ${hex(tinta.alfa >= 1 ? tinta.rgb : compor(tinta, t["--bg"].rgb))}  — ${papel}, ${rotulo}`);
      console.log(linhas.join("\n"));
    }
  }
}

console.log("\n" + "=".repeat(72));
console.log(`${medidos} pares medidos.`);
console.log(`${falhas} abaixo de 3,0 — nao servem para texto de tamanho nenhum.`);
console.log(`${parciais} entre 3,0 e 4,5 — servem so em texto grande (>= 24px).`);
console.log("Filetes e --ink-4 sao medidos e NAO julgados: o papel deles nao tem minimo WCAG.");
console.log("Fonte: " + FONTE.replace(raiz + "/", ""));
console.log("Nenhum numero aqui foi copiado a mao: todos saem do protótipo lido agora.");
