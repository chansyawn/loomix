import { notFound } from "@tanstack/react-router";
import { createResourceReader } from "@/infrastructure/resources";
import { readStarseaDocument } from "../starsea/data";
import { neighborEncounterIslets } from "../starsea/view";
import { readVignetteTemplates } from "../vignettes/data";
import { neighborVignettes } from "../vignettes/view";
import { readNeighborsData } from "./data";

export async function loadNeighborDetail(id: string, request: typeof fetch = fetch) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw notFound();
  const read = createResourceReader(request);
  const { view, image } = await readNeighborsData(read);
  const neighbor = view.neighbors.find((entry) => entry.id === Number(id));
  if (!neighbor) throw notFound();
  return {
    neighbor,
    readIslets: async () =>
      neighborEncounterIslets(await readStarseaDocument(read), neighbor.id, image),
    readVignettes: async () =>
      neighborVignettes(await readVignetteTemplates(read), neighbor.id, image),
  };
}
