export function recipeEffectIds(raw: string | null, productId: number): number[] {
  if (!raw) return [];
  if (!/^\d+(?:[,;]\d+)*$/.test(raw))
    throw new Error(`Unsupported recipe effect list ${productId}: ${raw}`);
  return raw.split(/[,;]/).map(Number);
}
