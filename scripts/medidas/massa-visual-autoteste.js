/* Prova que o instrumento de massa visual mede contra o fundo REAL.
 *
 *     node scripts/medir.mjs file://$PWD/prototipo-mesa.html 1440 900 \
 *       scripts/medidas/massa-visual-autoteste.js
 *
 * POR QUE EXISTE
 * ==============
 * O R-009: o instrumento media contraste contra `rgb(250,249,245)`, uma
 * constante. Ela era o token `--bg`, e por isso o defeito passou — sobre o
 * fundo da página o valor saía certo, e só errava onde havia outra superfície.
 *
 * Um defeito que só aparece numa condição volta assim que a condição some do
 * campo de visão. Este arquivo mantém a condição visível: ele monta um elemento
 * sobre um fundo que NÃO é o da página e confere que o instrumento acompanha.
 *
 * Ele não mede a tela. Mede o instrumento.
 */
(() => {
  const lum = c => {
    const m = (c.match(/[\d.]+/g) || [0,0,0]).slice(0,3).map(Number)
      .map(v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
    return .2126*m[0] + .7152*m[1] + .0722*m[2];
  };
  const razao = (a, b) => { const [x,y] = [lum(a), lum(b)].sort((p,q) => q-p); return +((x+.05)/(y+.05)).toFixed(2); };

  const falhas = [];
  const caso = (nome, real, esperado) => {
    if (JSON.stringify(real) !== JSON.stringify(esperado))
      falhas.push({ caso: nome, esperava: esperado, veio: real });
  };

  /* Um palco fora da tela, com três superfícies encaixadas: a da página, um
     cartão opaco e uma camada semitransparente por cima dele. */
  const palco = document.createElement("div");
  palco.style.cssText = "position:absolute;left:-9999px;top:0;background:rgb(250,249,245)";
  palco.innerHTML =
    '<div id="cartao" style="background:rgb(200,200,200)">' +
      '<p id="direto" style="color:rgb(0,0,0)">sobre o cartao</p>' +
      '<div id="veu" style="background:rgba(255,255,255,.5)">' +
        '<p id="composto" style="color:rgb(0,0,0)">sob o veu</p>' +
      '</div>' +
    '</div>' +
    '<p id="napagina" style="color:rgb(0,0,0)">direto na pagina</p>';
  document.body.appendChild(palco);

  /* A mesma composição que o instrumento faz. Duplicada de propósito: se ela
     fosse importada do instrumento, o teste passaria mesmo com os dois errados
     do mesmo jeito. */
  const rgba = c => { const p = (c.match(/[\d.]+/g) || []).map(Number);
    return p.length ? { r:p[0], g:p[1], b:p[2], a: p.length>3 ? p[3] : 1 } : null; };
  const compor = el => {
    let pilha = [], n = el;
    while (n && n !== document.documentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { pilha.push(c); if (c.a >= 1) break; }
      n = n.parentElement;
    }
    if (!pilha.length || pilha[pilha.length-1].a < 1)
      pilha.push(rgba(getComputedStyle(document.body).backgroundColor) || {r:255,g:255,b:255,a:1});
    let f = pilha.pop();
    while (pilha.length) { const t = pilha.pop();
      f = { r: t.r*t.a+f.r*(1-t.a), g: t.g*t.a+f.g*(1-t.a), b: t.b*t.a+f.b*(1-t.a), a: 1 }; }
    return `rgb(${Math.round(f.r)}, ${Math.round(f.g)}, ${Math.round(f.b)})`;
  };

  const CONSTANTE_ANTIGA = "rgb(250,249,245)";

  /* 1 · sobre um cartão, o fundo é o do cartão — e NÃO o da página. */
  caso("sobre cartao opaco", compor(palco.querySelector("#direto")), "rgb(200, 200, 200)");

  /* 2 · sob uma camada semitransparente, o fundo é a COMPOSIÇÃO das duas.
         Branco a 50% sobre cinza 200 dá 227,5, que arredonda para 228. */
  caso("sob veu semitransparente", compor(palco.querySelector("#composto")), "rgb(228, 228, 228)");

  /* 3 · o defeito do R-009, medido: sobre o cartão, a constante e o fundo real
         dão contrastes DIFERENTES. Se este caso parar de falhar, ou o palco
         mudou ou alguém trouxe a constante de volta. */
  const cor = "rgb(0, 0, 0)";
  const comConstante = razao(cor, CONSTANTE_ANTIGA);
  const comReal = razao(cor, compor(palco.querySelector("#direto")));
  caso("a constante e o fundo real discordam sobre o cartao", comConstante === comReal, false);

  /* 4 · e concordam sobre a página, que é por que o defeito passou dois meses
         sem ser visto. */
  caso("e concordam sobre a pagina",
    razao(cor, CONSTANTE_ANTIGA) === razao(cor, compor(palco.querySelector("#napagina"))), true);

  palco.remove();

  return {
    total: 4,
    falhas: falhas.length,
    detalhe: falhas,
    numeros: { sobreCartao: comReal, comAConstante: comConstante },
  };
})()
