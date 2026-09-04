/* O livro do que o Erik já rejeitou — e a cobrança de que fechar exige prova.
 *
 *     node scripts/rejeitado.mjs
 *     node scripts/rejeitado.mjs --provar
 *
 * POR QUE ISTO EXISTE
 * ===================
 * Em 02/09 o Erik escreveu: *"sistema de destaque de livro na estante continua
 * péssimo apesar dos meus feedbacks"*. O feedback existia. Ele estava num
 * transcrito de conversa — que ninguém relê, que nenhum instrumento consulta e
 * que some quando a janela de contexto vira. Trinta e oito críticas dele, de 01
 * e 02/09, ficaram assim: escritas, entendidas na hora, e sem casa.
 *
 * Um sistema de design guarda como as coisas DEVEM ser. Nada aqui guardava o
 * que já foi julgado e RECUSADO — e é a recusa que se repete, porque quem
 * refaz não sabe que aquilo já foi tentado e reprovado.
 *
 * A REGRA QUE MORDE
 * =================
 * Fechar um item exige uma PROVA: um comando que falha enquanto o defeito está
 * lá e passa quando some. Sem isso, "fechado" é opinião, e opinião não segura
 * regressão — o item volta na próxima varredura e o Erik descobre pela terceira
 * vez, na tela dele.
 *
 *   FECHADO SEM PROVA   alguém declarou pronto e nada sustenta a declaração.
 *   REGREDIU            a prova existia, passava, e hoje falha. É a única forma
 *                       honesta de dizer "voltou".
 *   ABERTO              dívida conhecida. Conta, aparece, não derruba: item sem
 *                       prova ainda por escrever é normal; portão que reprova o
 *                       normal é portão que se aprende a ignorar.
 *
 * O item NÃO se fecha porque a tela ficou bonita. Fecha porque existe uma
 * medida que sabe ficar vermelha.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RAIZ = new URL('..', import.meta.url).pathname;
const LIVRO = RAIZ + 'docs/REJEITADO.md';

/* ### R-01 · 2026-09-01 · aberto  →  campos em linhas `**Campo:** valor` */
function ler(texto) {
  const itens = [];
  let atual = null, cerca = false;
  for (const linha of texto.split('\n')) {
    /* O bloco cercado do cabecalho e o EXEMPLO do formato. Sem esta linha o
       instrumento le a propria documentacao como dado e conta um item R-00 que
       nao existe — a mesma familia de erro do verificador que acusava prosa. */
    if (linha.trim().startsWith('```')) { cerca = !cerca; continue; }
    if (cerca) continue;
    const cab = /^###\s+(R-\d+)\s*·\s*([\d-]+)\s*·\s*(aberto|fechado)\s*$/.exec(linha.trim());
    if (cab) { atual = { id: cab[1], data: cab[2], estado: cab[3], campos: {} }; itens.push(atual); continue; }
    if (!atual) continue;
    const campo = /^\*\*([^:*]+):\*\*\s*(.*)$/.exec(linha.trim());
    if (campo) atual.campos[campo[1].toLowerCase()] = campo[2].trim();
  }
  return itens;
}

function prova(item) {
  const bruto = (item.campos.prova || '').replace(/^`|`$/g, '').trim();
  return bruto && bruto !== 'sem-prova' ? bruto : null;
}

function julgar(itens) {
  const faltas = [], abertos = [];
  for (const item of itens) {
    const cmd = prova(item);
    if (item.estado === 'aberto') { abertos.push(item); continue; }
    if (!cmd) { faltas.push({ tipo: 'FECHADO SEM PROVA', item }); continue; }
    try {
      execSync(cmd, { cwd: RAIZ, stdio: 'pipe', timeout: 120000 });
    } catch (e) {
      faltas.push({ tipo: 'REGREDIU', item, detalhe: String(e.stderr || e.stdout || e.message).trim().split('\n').slice(-2).join(' ').slice(0, 160) });
    }
  }
  return { faltas, abertos };
}

if (process.argv.includes('--provar')) {
  const bom = ler('### R-99 · 2026-01-01 · fechado\n**Prova:** `true`\n');
  const ruim = ler('### R-98 · 2026-01-01 · fechado\n**Prova:** `false`\n');
  const nu = ler('### R-97 · 2026-01-01 · fechado\n**Prova:** sem-prova\n');
  const a = julgar(bom).faltas.length === 0;
  const b = julgar(ruim).faltas[0]?.tipo === 'REGREDIU';
  const c = julgar(nu).faltas[0]?.tipo === 'FECHADO SEM PROVA';
  console.log(a && b && c
    ? 'CONTROLE NEGATIVO: passa com prova viva, acusa prova morta, acusa ausencia de prova. Serve.'
    : `CONTROLE NEGATIVO FALHOU: viva=${a} morta=${b} ausente=${c}`);
  process.exit(a && b && c ? 0 : 1);
}

if (!existsSync(LIVRO)) { console.log('rejeitado: docs/REJEITADO.md nao existe.'); process.exit(1); }
const itens = ler(readFileSync(LIVRO, 'utf8'));
if (!itens.length) { console.log('rejeitado: livro sem itens legiveis. Confira o formato do cabecalho.'); process.exit(1); }
const { faltas, abertos } = julgar(itens);
const fechados = itens.length - abertos.length;
console.log(`rejeitado: ${itens.length} itens · ${fechados} fechados · ${abertos.length} abertos\n`);
if (abertos.length) {
  console.log(`  ABERTO  (${abertos.length}) — divida conhecida, nao derruba`);
  for (const i of abertos) console.log(`      ${i.id}  ${(i.campos.erik || '').slice(0, 88)}`);
  console.log('');
}
if (!faltas.length) { console.log('Nenhum item fechado sem prova, nenhum regredido.'); process.exit(0); }
const porTipo = {};
for (const f of faltas) (porTipo[f.tipo] ??= []).push(f);
for (const [tipo, lista] of Object.entries(porTipo)) {
  console.log(`  ${tipo}  (${lista.length})`);
  for (const f of lista) console.log(`      ${f.item.id}  ${(f.item.campos.erik || '').slice(0, 80)}${f.detalhe ? '\n          ' + f.detalhe : ''}`);
  console.log('');
}
process.exit(1);
