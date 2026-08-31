import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./estilo/base.css";
import { aplicarEspelhoAgora } from "./estado/tema.js";
import { App } from "./App.jsx";

/* O tema ANTES do primeiro desenho. Depois dele, a tela pisca. */
aplicarEspelhoAgora();

createRoot(document.getElementById("raiz")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
