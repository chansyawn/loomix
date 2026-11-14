import { catalogAdmissionIds } from "../content/catalog-admissions.ts";
import path from "node:path";
import type { WorkOptions } from "../types.ts";
import { createContentContext } from "../content/context.ts";
import { writeJson } from "../../workflow/json.ts";
import { readCraftingRecipes } from "./read.ts";
import { parseNeighborClothingDatabase } from "../neighbors/schema.ts";
import { readJson } from "../../workflow/json.ts";

export async function buildCrafting(options: WorkOptions): Promise<void> {
  const context = createContentContext(options.work);
  const clothing = parseNeighborClothingDatabase(
    readJson(path.join(options.work, "raw/neighbor-clothing.json")),
  );
  const { audit, proofs } = readCraftingRecipes(
    context,
    catalogAdmissionIds(
      context,
      clothing.items.map((item) => item.id),
    ),
  );
  writeJson(path.join(options.work, "crafting-recipes-audit.json"), { recipes: audit, proofs });
}
