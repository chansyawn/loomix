import type { ImageRef } from "@loomix/schema/assets";
import type { ImageBinding, ImageJob, ImageNeed, OriginalImage } from "./model.ts";

export function bindImages(needs: readonly ImageNeed[], originals: readonly OriginalImage[]) {
  const byObject = new Map<string, OriginalImage>();
  for (const original of originals) {
    if (byObject.has(original.object)) throw new Error(`Duplicate original ${original.object}`);
    byObject.set(original.object, original);
  }
  const bindings: ImageBinding[] = [];
  const references = new Map<string, ImageRef | null>();
  const jobs = new Map<string, ImageJob>();
  for (const need of needs) {
    if (references.has(need.id)) throw new Error(`Duplicate image use ${need.id}`);
    const candidates = need.candidates
      .map((candidate) => {
        const original = byObject.get(candidate.object);
        if (!original || original.width <= 0 || original.height <= 0)
          throw new Error(`Missing complete original ${candidate.object}`);
        return { ...candidate, original };
      })
      .sort(
        (a, b) =>
          b.original.width * b.original.height - a.original.width * a.original.height ||
          a.rank - b.rank ||
          a.object.localeCompare(b.object),
      );
    const chosen = candidates[0];
    if (!chosen && need.required) throw new Error(`Missing required image ${need.id}`);
    bindings.push({
      use: need.id,
      object: chosen?.object ?? null,
      reason: chosen ? null : need.reason,
    });
    const image = chosen ? { assetId: chosen.object, variant: need.variant } : null;
    references.set(need.id, image);
    if (chosen && image)
      jobs.set(`${image.assetId}:${image.variant}`, { ...image, original: chosen.original });
  }
  return {
    bindings: bindings.sort((a, b) => a.use.localeCompare(b.use)),
    jobs: [...jobs].sort(([a], [b]) => a.localeCompare(b)).map(([, job]) => job),
    image: (use: string | null): ImageRef | null => {
      if (use === null) return null;
      if (!references.has(use)) throw new Error(`Undeclared image use ${use}`);
      return references.get(use)!;
    },
  };
}
