/** Mantem a primeira ocorrencia de cada id (listas da API nao devem repetir, mas evita warning do React). */
export function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Map<number, T>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}
