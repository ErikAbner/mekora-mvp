export function destinoDoMenu(tecla, atual, total) {
  if (total <= 0) return null;
  if (tecla === "Home") return 0;
  if (tecla === "End") return total - 1;
  if (tecla === "ArrowDown") return atual < 0 ? 0 : (atual + 1) % total;
  if (tecla === "ArrowUp") return atual < 0 ? total - 1 : (atual - 1 + total) % total;
  return null;
}
