#!/usr/bin/env node
/* A folha de contato da biblioteca de ícones.
 *
 * O `icones.mjs` responde "27 arquivos, 27 desenhos distintos" — ele compara
 * BYTES. Dois desenhos podem ser diferentes byte a byte e ainda assim mostrar a
 * mesma coisa, ou mostrar coisa nenhuma parecida com o rótulo. Isso é uma
 * pergunta de olho, e olho precisa de todos os glifos na mesma tela.
 *
 * Foi assim que a auditoria de 07/09 confirmou os dois pares e recusou o resto:
 * `estudos` e `mesa` são glifos abstratos, e abstrato não é errado; `marcador` é
 * um hexágono com um ponto e não a fita que marca a página; o par `baixar`/
 * `enviar` não espelha — um põe a barra acima da seta, o outro põe a bandeja
 * abaixo. As três continuam anotadas e nenhuma é defeito.
 *
 *   node scripts/folha-de-icones.mjs
 *   node scripts/medir.mjs http://localhost:5181/_folha-icones.html 1180 460 \
 *     <medida> --png=<arq>
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, "web/publico/icones");

const arquivos = readdirSync(PASTA).filter((n) => n.startsWith("icone-") && n.endsWith(".svg")).sort();
const celulas = arquivos.map((n) =>
  `<figure><span class="i">${readFileSync(join(PASTA, n), "utf8")}</span>` +
  `<figcaption>${n.replace("icone-", "").replace(".svg", "")}</figcaption></figure>`).join("\n");

writeFileSync(join(RAIZ, "web/publico/_folha-icones.html"), `<!doctype html>
<meta charset="utf-8"><title>folha de ícones</title>
<style>
body { margin: 0; padding: 24px; background: #fff; color: #141414; font: 13px system-ui; }
.grade { display: grid; grid-template-columns: repeat(9, 104px); gap: 20px; }
figure { margin: 0; text-align: center; }
.i { display: grid; place-items: center; width: 104px; height: 72px; border: 1px solid #ddd; }
.i svg { width: 32px; height: auto; }
figcaption { margin-top: 6px; font: 11px ui-monospace, monospace; color: #555; }
</style>
<div class="grade">
${celulas}
</div>
`);
console.log(`folha: ${arquivos.length} ícones`);
