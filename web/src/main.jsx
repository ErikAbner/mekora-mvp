import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./estilo/base.css";
import { aplicarEspelhoAgora } from "./estado/tema.js";
import { App } from "./App.jsx";
import { LimiteDeErro } from "./componentes/LimiteDeErro.jsx";

/* O tema ANTES do primeiro desenho. Depois dele, a tela pisca. */
aplicarEspelhoAgora();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const registro = await navigator.serviceWorker.register("/service-worker.js", {
        updateViaCache: "none",
      });
      let recarregando = false;

      /* O app instalado pode ficar aberto por dias. Quando um build novo toma
       * controle, recarrega uma única vez para não deixar aquela janela presa
       * ao JavaScript antigo até a pessoa lembrar de usar Cmd+R. */
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (recarregando) return;
        recarregando = true;
        window.location.reload();
      });

      const procurarAtualizacao = async () => {
        registro.update().catch(() => {});
        try {
          const resposta = await fetch(`/assets/mekora-version.json?agora=${Date.now()}`, { cache: "no-store" });
          const { versao } = await resposta.json();
          if (versao && versao !== __MEKORA_BUILD_ID__) window.location.reload();
        } catch (_erro) {
          /* Sem servidor não há versão nova para carregar. */
        }
      };
      window.setInterval(procurarAtualizacao, 60_000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") procurarAtualizacao();
      });
      procurarAtualizacao();
    } catch (_erro) {
      /* O Mekora continua utilizável sem instalação/PWA. */
    }
  });
} else if ("serviceWorker" in navigator) {
  /* Uma instalação antiga feita pela porta de desenvolvimento continuava
   * controlando o Vite mesmo depois de o registro deixar de acontecer aqui.
   * Ela podia devolver um index antigo apontando para um bundle já removido:
   * janela inteira branca, sem erro visível. O app instalável oficial é o da
   * porta 8000; em desenvolvimento não deve haver worker persistente. */
  navigator.serviceWorker.getRegistrations().then((registros) =>
    Promise.all(registros.filter((r) => r.scope.startsWith(location.origin)).map((r) => r.unregister())),
  ).catch(() => {});
  if ("caches" in window) {
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c.startsWith("mekora-shell-")).map((c) => caches.delete(c)))).catch(() => {});
  }
}

createRoot(document.getElementById("raiz")).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>,
);
