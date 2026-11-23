import { notFound } from "@tanstack/react-router";
import { parseImageIndex } from "@loomix/schema/assets";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { parseStarsea } from "@loomix/schema/starsea";
import { createResourceReader } from "@/infrastructure/resources";
import { toStarseaDetail, toStarseaList } from "./view";

export async function loadStarseaList(request: typeof fetch = fetch) {
  const read = createResourceReader(request);
  const [starsea, imageIndex] = await Promise.all([
    read("starsea", parseStarsea),
    read("image-index", parseImageIndex),
  ]);
  return toStarseaList(starsea, imageIndex);
}

export async function loadStarseaDetail(id: string, request: typeof fetch = fetch) {
  const isletId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(isletId)) throw notFound();

  const read = createResourceReader(request);
  const [starsea, imageIndex, catalog, neighbors] = await Promise.all([
    read("starsea", parseStarsea),
    read("image-index", parseImageIndex),
    read("catalog", parseCatalog),
    read("neighbors", parseNeighbors),
  ]);
  const detail = toStarseaDetail(isletId, starsea, imageIndex, catalog, neighbors);
  if (!detail) throw notFound();
  return detail;
}
