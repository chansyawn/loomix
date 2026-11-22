import { notFound } from "@tanstack/react-router";
import { parseAssets } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { parseVignettes } from "@loomix/schema/vignettes";
import { createResourceReader } from "@/infrastructure/resources";
import { toVignetteDetail, toVignetteList } from "./view";

export async function loadVignetteList(request: typeof fetch = fetch) {
  const read = createResourceReader(request);
  const [vignettes, assets] = await Promise.all([
    read("vignettes", parseVignettes),
    read("assets", parseAssets),
  ]);
  return toVignetteList(vignettes, assets);
}

export async function loadVignetteDetail(id: string, request: typeof fetch = fetch) {
  const templateId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(templateId)) throw notFound();

  const read = createResourceReader(request);
  const [vignettes, assets, catalog, gameplayTags, neighbors] = await Promise.all([
    read("vignettes", parseVignettes),
    read("assets", parseAssets),
    read("catalog", parseCatalog),
    read("gameplay-tags", parseGameplayTags),
    read("neighbors", parseNeighbors),
  ]);
  const detail = toVignetteDetail(templateId, {
    vignettes,
    assets,
    catalog,
    gameplayTags,
    neighbors,
  });
  if (!detail) throw notFound();
  return detail;
}
