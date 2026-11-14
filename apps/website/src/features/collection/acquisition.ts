import type { Item } from "@loomix/schema/catalog";

type Acquisition = Item["acquisition"];

export function acquisitionLabels(acquisition: Acquisition): string[] {
  return [
    ...new Set(
      acquisition?.map(({ label, condition }) =>
        condition ? `${label}（${condition}）` : label,
      ) ?? [],
    ),
  ];
}

export function acquisitionText(acquisition: Acquisition): string | null {
  return acquisitionLabels(acquisition).join("，") || null;
}
