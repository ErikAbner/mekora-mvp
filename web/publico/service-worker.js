const CACHE = "mekora-shell-v5";
const SHELL = ["/manifest.webmanifest", "/app-icon.svg", "/app-icon-192.png", "/app-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isPublicAsset(url) {
  // Este arquivo é justamente o sinal de que há um pacote novo. Guardá-lo no
  // cache impediria a comparação e perpetuaria a versão antiga.
  if (url.pathname === "/assets/mekora-version.json") return false;
  return ["/assets/", "/fontes/", "/icones/", "/capas/"].some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => new Response(`<!doctype html>
        <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Mekora — iniciador local</title>
        <style>
          *{box-sizing:border-box}body{margin:0;background:#f9f9f9;color:#151515;font:18px/1.5 Georgia,serif}
          main{max-width:680px;margin:15vh auto;padding:32px}h1{max-width:540px;margin:0 0 24px;font-size:40px;line-height:1.15;text-wrap:balance}
          p{max-width:620px;margin:0 0 24px;color:#555;text-wrap:pretty}.acoes{display:flex;flex-wrap:wrap;gap:12px}
          a,button{display:inline-flex;min-height:50px;align-items:center;justify-content:center;padding:0 22px;border:1px solid #151515;font:700 17px/1 Georgia,serif;text-decoration:none;cursor:pointer}
          a{background:#151515;color:#fff}button{background:transparent;color:#151515}.estado{min-height:27px;margin-top:18px;color:#777;font-size:15px}
          @media(max-width:600px){main{margin:10vh auto;padding:24px}h1{font-size:34px}.acoes>*{width:100%}}
        </style></head>
        <body><main><h1>O Mekora local não está aberto.</h1>
          <p>Abra o iniciador local para continuar. Seus livros e seu progresso permanecem guardados neste computador.</p>
          <div class="acoes"><a id="iniciar" href="mekora-local://abrir">Abrir o Mekora local</a><button id="repetir" type="button">Tentar novamente</button></div>
          <p class="estado" id="estado" role="status" aria-live="polite"></p>
        </main><script>
          const estado=document.getElementById("estado");
          async function verificar(){try{const resposta=await fetch("/health",{cache:"no-store"});if(resposta.ok){estado.textContent="Mekora aberto. Voltando…";location.reload();return}}catch(_erro){}setTimeout(verificar,900)}
          document.getElementById("iniciar").addEventListener("click",()=>{estado.textContent="Iniciando. Esta tela volta sozinha quando estiver pronto…"});
          document.getElementById("repetir").addEventListener("click",()=>location.reload());
          verificar();
        </script></body></html>`, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })),
    );
    return;
  }

  // Documentos, dados pessoais e APIs nunca entram no cache do aplicativo.
  if (!isPublicAsset(url)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
