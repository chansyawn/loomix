import type { CatalogEntrySummary } from "../collection-view";

export type DetailNavigationEntry = Readonly<
  Pick<CatalogEntrySummary, "id" | "name" | "image"> & { label?: string }
>;
export type DetailNavigationGroup = Readonly<{
  key: string;
  label: string;
  entries: readonly DetailNavigationEntry[];
}>;
export type DetailNavigationModel = Readonly<{
  groups: readonly DetailNavigationGroup[];
  notice?: string;
}>;

type SetNavigationData = {
  items: readonly CatalogEntrySummary[];
  sets: readonly (CatalogEntrySummary & { componentIds: readonly number[] | null })[];
};

function navigationEntry(record: CatalogEntrySummary, label?: string): DetailNavigationEntry {
  return { id: record.id, name: record.name, image: record.image, label };
}

export function setDetailNavigation(
  data: SetNavigationData,
  currentId: number,
  groupLabel: "套装" | "套组",
): DetailNavigationModel {
  const items = new Map(data.items.map((item) => [item.id, item]));
  const currentSet = data.sets.find((set) => set.id === currentId);
  if (!currentSet && !items.has(currentId)) return { groups: [] };

  const sets = currentSet
    ? [currentSet]
    : data.sets.filter((set) => set.componentIds?.includes(currentId));
  const groups = sets.map((set): DetailNavigationGroup => {
    const entries = [
      navigationEntry(set, `${groupLabel}概览`),
      ...(set.componentIds ?? []).flatMap((id) => {
        const item = items.get(id);
        return item ? [navigationEntry(item)] : [];
      }),
    ];
    return {
      key: `set-${set.id}`,
      label: set.name,
      entries: [...new Map(entries.map((entry) => [entry.id, entry])).values()],
    };
  });
  return {
    groups: groups.filter((group) => group.entries.some((entry) => entry.id !== currentId)),
    notice:
      !currentSet && data.sets.some((set) => set.componentIds === null)
        ? `其他${groupLabel}的成员关系未确认`
        : undefined,
  };
}
