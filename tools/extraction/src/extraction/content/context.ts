import path from "node:path";
import type { TableRow, BinDataAsset, IndexedAsset, IconMatch } from "../types.ts";
import { readJson } from "../../workflow/json.ts";
import { profile } from "../../profile.ts";
import { Tables } from "../decode/tables.ts";
import { parseBinData } from "../decode/bindata.ts";
import { createIconResolver } from "../images/resolve.ts";
import { createVocabulary } from "./vocabulary.ts";
import type { Vocabulary } from "./vocabulary.ts";
import { readAdmissions } from "./admissions.ts";
import { classify, resolveMemberships } from "./scope.ts";
import type { Scope } from "./scope.ts";
import { buildIngredientCategories } from "./recipes.ts";
import type { IngredientCategoryBuild } from "./recipes.ts";

export interface ContentContext {
  tables: Tables;
  vocabulary: Vocabulary;
  scope: Scope;
  main: Map<number | null, TableRow>;
  ui: Map<number | null, TableRow>;
  creatures: Map<number | null, TableRow>;
  recipesByProduct: Map<number, TableRow>;
  recipeRows: TableRow[];
  outsideRecipeRows: TableRow[];
  ingredientCategoryBuild: IngredientCategoryBuild;
  resolveIcon(reference: string): IconMatch | null;
}

function uiSignature(tables: Tables) {
  const fields = profile.fields.ui;
  return (row: TableRow) => ({
    numbers: [0, 8, 9, fields.quality, fields.description, fields.series].map((field) =>
      tables.uint(row, field, 0),
    ),
    sources: tables.vector(row, fields.sources),
    strings: [
      fields.smallIcon,
      fields.largeIcon,
      fields.habitat,
      fields.region,
      fields.times,
      fields.weather,
      fields.seasons,
    ].map((field) => tables.string(row, field)),
  });
}

export function createContentContext(work: string): ContentContext {
  const tables = new Tables(path.join(work, "prepared"));
  const manifests = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const bin = (name: string) => {
    const file = manifests.find((asset) => asset.Name === name)?.file ?? "missing-bindata";
    return readJson(path.isAbsolute(file) ? file : path.join(work, file));
  };
  const { tree, tagDisplay, display } = parseBinData(
    bin(profile.binData.tags),
    bin(profile.binData.tagDisplay),
    bin(profile.binData.creatureDisplay),
  );
  const vocabulary = createVocabulary(tables, tree, tagDisplay, display);
  const main = tables.byId(profile.roots.items);
  const creatures = tables.byId(profile.roots.creatures);
  const classification = classify(tables, vocabulary, main, readAdmissions(work));
  const ui = tables.byId(profile.roots.ui, uiSignature(tables), classification.ids);
  const scope = resolveMemberships(tables, classification);

  const ingredientCategoryBuild = buildIngredientCategories(tables, vocabulary, scope);
  const recipeRows = tables.rows(profile.roots.recipes);
  const recipesByProduct = new Map<number, TableRow>();
  const outsideRecipeRows: TableRow[] = [];
  for (const row of recipeRows) {
    const id = tables.uint(row, 4);
    if (id == null) continue;
    if (scope.groups.get(id) !== "dishes.item") {
      outsideRecipeRows.push(row);
      continue;
    }
    if (recipesByProduct.has(id)) throw new Error(`Duplicate dish recipe ${id}`);
    recipesByProduct.set(id, row);
  }

  return {
    tables,
    vocabulary,
    scope,
    main,
    ui,
    creatures,
    recipesByProduct,
    recipeRows,
    outsideRecipeRows,
    ingredientCategoryBuild,
    resolveIcon: createIconResolver(
      readJson<IndexedAsset[]>(path.join(work, "prepared", "textures.json")),
      readJson<IndexedAsset[]>(path.join(work, "prepared", "sprites.json")),
    ),
  };
}
