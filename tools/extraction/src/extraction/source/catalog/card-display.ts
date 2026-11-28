import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { TableRow } from "../../types.ts";
import type { imageCollector, LocatedImage } from "../images.ts";
import type { ContentContext } from "./context.ts";

export function isPlaceholderIcon(reference: string): boolean {
  return /^uisprite\/load\/item\/cloud(?:\.png)?$/i.test(reference.trim().replaceAll("\\", "/"));
}

export function cardIcon(
  context: ContentContext,
  images: ReturnType<typeof imageCollector>,
  id: number,
  row: TableRow | undefined,
  sources: EvidenceSource[],
) {
  const references = [5, 4].flatMap((field) => {
    const reference = context.tables.string(row, field);
    return reference && !isPlaceholderIcon(reference) ? [reference] : [];
  });
  const candidates = references.flatMap((reference): LocatedImage[] => {
    const match = context.resolveIcon(reference);
    return match?.matched && match.source && match.pathId && match.container && match.resourceName
      ? [
          {
            reference,
            assetType: match.assetType,
            source: match.source,
            pathId: match.pathId,
            container: match.container,
            resourceName: match.resourceName,
          },
        ]
      : [];
  });
  return images.need(
    { kind: "item", id, field: "image" },
    candidates,
    "icon",
    sources,
    "image_not_configured_or_matched",
    false,
    references,
  );
}
