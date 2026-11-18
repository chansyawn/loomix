import { notFound } from "@tanstack/react-router";
import { parseAssets } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { parseStarsea } from "@loomix/schema/starsea";
import { createResourceReader } from "@/infrastructure/resources";
import { toStarseaDetail, toStarseaList } from "./view";

export async function loadStarseaList(request: typeof fetch = fetch) {
  const read = createResourceReader(request);
  const [starsea, assets] = await Promise.all([
    read("starsea", parseStarsea),
    read("assets", parseAssets),
  ]);
  return toStarseaList(starsea, assets);
}

export async function loadStarseaDetail(id: string, request: typeof fetch = fetch) {
  const isletId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(isletId)) throw notFound();

  const read = createResourceReader(request);
  const [starsea, assets, catalog, neighbors] = await Promise.all([
    read("starsea", parseStarsea),
    read("assets", parseAssets),
    read("catalog", parseCatalog),
    read("neighbors", parseNeighbors),
  ]);
  const detail = toStarseaDetail(isletId, starsea, assets, catalog, neighbors);
  if (!detail) throw notFound();
  return detail;
}
