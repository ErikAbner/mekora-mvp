/* GERADO por scripts/rotas.py — não editar à mão.
 *
 * Os caminhos que pertencem ao backend. O proxy de desenvolvimento e a borda de
 * produção leem a MESMA lista, para que uma rota nova funcione nos dois lugares
 * ou em nenhum — e nunca só em desenvolvimento, que é o modo de falhar caro.
 *
 * Para atualizar:  python3 scripts/rotas.py
 */
export const PREFIXOS_API = [
  "/analyze",
  "/app-config",
  "/batch",
  "/config",
  "/health",
  "/history",
  "/jobs",
  "/metrics",
  "/pending-send",
  "/presets",
  "/storage",
  "/tools",
  "/translation",
  "/upload",
];
