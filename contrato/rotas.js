/* GERADO por scripts/rotas.py — não editar à mão.
 *
 * Os caminhos que pertencem ao backend. O proxy de desenvolvimento e a borda de
 * produção leem a MESMA lista, para que uma rota nova funcione nos dois lugares
 * ou em nenhum — e nunca só em desenvolvimento, que é o modo de falhar caro.
 *
 * A LISTA VEM PARTIDA EM DUAS, e a partição custou uma sessão para aparecer:
 *
 *   COM_SUBCAMINHO  o backend responde ABAIXO deste caminho — /jobs/1/status,
 *                   /entrar/{token}. O caminho sozinho não é dele.
 *   EXATAS          o backend responde NELE — /eu, /health, /upload.
 *
 * `/entrar` é o caso que obriga a distinção: o backend responde em
 * /entrar/pedir e /entrar/{token}, e /entrar sozinho é uma TELA. Tratado como
 * prefixo simples, o pedido da tela ia para o backend — e ia SÓ EM
 * DESENVOLVIMENTO, porque a borda de produção já separava. A tela abria no
 * servidor e não abria na máquina de quem a escreveu.
 *
 * Para atualizar:  python3 scripts/rotas.py
 */
export const COM_SUBCAMINHO = [
  "/analyze",
  "/aparelhos",
  "/app-config",
  "/batch",
  "/config",
  "/entrar",
  "/jobs",
  "/metrics",
  "/notas",
  "/pending-send",
  "/presets",
  "/storage",
  "/tools",
  "/translation",
];

export const EXATAS = [
  "/aparelhos",
  "/app-config",
  "/config",
  "/eu",
  "/health",
  "/history",
  "/notas",
  "/preferencias",
  "/presets",
  "/sair",
  "/upload",
];

/* Todos, para quem só precisa saber se um caminho é do backend. */
export const PREFIXOS_API = [...new Set([...COM_SUBCAMINHO, ...EXATAS])].sort();
