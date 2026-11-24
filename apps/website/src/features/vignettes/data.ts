import { notFound } from "@tanstack/react-router";
import { parseImageIndex } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { parseVignettes, type Vignettes } from "@loomix/schema/vignettes";
import { createResourceReader } from "@/infrastructure/resources";
import { toVignetteDetail, toVignetteList } from "./view";

const templateCache = new Map<string, Promise<Vignettes>>();

export function readVignetteTemplates(read: ReturnType<typeof createResourceReader>) {
  return read("vignettes", parseVignettes, templateCache);
}

export async function loadVignetteList(request: typeof fetch = fetch) {
  const read = createResourceReader(request);
  const [vignettes, imageIndex] = await Promise.all([
    read("vignettes", parseVignettes),
    read("image-index", parseImageIndex),
  ]);
  return toVignetteList(vignettes, imageIndex);
}

export async function loadVignetteDetail(id: string, request: typeof fetch = fetch) {
  const templateId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(templateId)) throw notFound();

  const read = createResourceReader(request);
  const [vignettes, imageIndex, catalog, gameplayTags, neighbors] = await Promise.all([
    read("vignettes", parseVignettes),
    read("image-index", parseImageIndex),
    read("catalog", parseCatalog),
    read("gameplay-tags", parseGameplayTags),
    read("neighbors", parseNeighbors),
  ]);
  const detail = toVignetteDetail(templateId, {
    vignettes,
    imageIndex,
    catalog,
    gameplayTags,
    neighbors,
  });
  if (!detail) throw notFound();
  return detail;
}
