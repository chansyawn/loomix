import type { Acquisition } from "@loomix/schema/catalog";

export function acquisitionLabels(acquisition: readonly Acquisition[] | null): string[] {
  return [...new Set(acquisition?.map(({ label }) => label) ?? [])];
}

export function acquisitionText(acquisition: readonly Acquisition[] | null): string | null {
  return acquisitionLabels(acquisition).join("，") || null;
}
