export function seriesPreview<T extends { id: number; image: string | null }>(
  memberIds: readonly number[] | null,
  items: readonly T[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return (memberIds ?? [])
    .flatMap((id) => {
      const item = byId.get(id);
      return item?.image ? [item] : [];
    })
    .slice(0, 6);
}
