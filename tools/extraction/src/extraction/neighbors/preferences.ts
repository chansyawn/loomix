import path from "node:path";
import { profile } from "../../profile.ts";
import type { BinDataAsset } from "../types.ts";
import { parseTagBinData } from "../decode/bindata.ts";
import { hashTextKey, Tables } from "../decode/tables.ts";
import type { TableRow } from "../types.ts";
import { readJson } from "../../workflow/json.ts";
import { evidence } from "./adapters.ts";
import { assertLayout, requiredId, requiredText } from "./fields.ts";
import type {
  GiftPreferenceLevel,
  NeighborEvidence,
  NeighborEvidenceSource,
  NeighborExclusion,
  NeighborGiftPreference,
  NeighborGiftPreferenceTag,
  PreferenceTagCatalog,
} from "./types.ts";

const preferenceLevels = new Map<number, { level: GiftPreferenceLevel; name: string }>([
  [1, { level: "love", name: "喜爱" }],
  [2, { level: "favor", name: "好感" }],
  [4, { level: "dislike", name: "反感" }],
]);

const preferenceLayout = {
  neighbor: [0, "uint"],
  category: [1, "uint"],
  categoryName: [2, "string"],
  items: [3, "string"],
  tags: [4, "string"],
} as const;

function parseIds(value: string | null, context: string): number[] {
  if (value === null || value === "") return [];
  const parts = value.split(";");
  if (parts.at(-1) === "") parts.pop();
  if (parts.some((part) => !/^\d+$/.test(part)))
    throw new Error(`Invalid preference IDs: ${context}`);
  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0))
    throw new Error(`Invalid preference IDs: ${context}`);
  return [...new Set(ids)].sort((a, b) => a - b);
}

function tableSource(row: TableRow, fields: number[]): NeighborEvidenceSource {
  return {
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  };
}

export function loadPreferenceTagCatalog(work: string, tables: Tables): PreferenceTagCatalog {
  const manifest = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const findAsset = (name: string) => {
    const asset = manifest.find((entry) => entry.Name === name);
    if (!asset) throw new Error(`Missing preference BinData ${name}`);
    return {
      value: readJson(path.join(work, asset.file)),
      source: { kind: "asset" as const, file: asset.file, pathId: asset.PathID },
    };
  };
  const treeAsset = findAsset(profile.binData.tags);
  const displayAsset = findAsset(profile.binData.tagDisplay);
  const { tree, tagDisplay } = parseTagBinData(treeAsset.value, displayAsset.value);
  const tags = new Map<
    number,
    { internalName: string; nameZh: string | null; textId: string | null }
  >();
  for (const node of Object.values(tree)) {
    if (!Number.isSafeInteger(node.TagId) || node.TagId <= 0 || tags.has(node.TagId))
      throw new Error(`Invalid or duplicate GameplayTag ${node.TagId}`);
    const textId = tagDisplay[node.TagId]?.nameInGame?.textId ?? null;
    const nameZh = tables.key(textId);
    tags.set(node.TagId, { internalName: node.TagName, nameZh, textId });
  }
  return {
    tags,
    sources: { tree: treeAsset.source, display: displayAsset.source },
  };
}

export function readGiftPreferences(
  tables: Tables,
  neighborIds: ReadonlySet<number>,
  tagCatalog: PreferenceTagCatalog,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): { preferences: NeighborGiftPreference[]; tags: NeighborGiftPreferenceTag[] } {
  const categories = new Map<number, string>();
  for (const row of tables.rows(profile.roots.neighborPreferenceCategories)) {
    assertLayout(tables, row, { id: [0, "uint"], icon: [1, "string"], name: [2, "text"] }, 6);
    const id = requiredId(tables, row, 0);
    if (!preferenceLevels.has(id)) continue;
    const name = requiredText(tables.text(row, 2), `preference category:${id}`);
    if (name !== preferenceLevels.get(id)!.name || categories.has(id))
      throw new Error(`Unexpected preference category ${id}/${name}`);
    categories.set(id, name);
  }
  for (const [id, { name }] of preferenceLevels)
    if (categories.get(id) !== name) throw new Error(`Missing preference category ${id}/${name}`);

  const itemIds = new Set(tables.byId(profile.roots.items).keys());
  const preferences: NeighborGiftPreference[] = [];
  const usedTagIds = new Set<number>();
  for (const row of tables.rows(profile.roots.neighborGiftPreferences)) {
    assertLayout(tables, row, preferenceLayout, 5);
    const neighborId = requiredId(tables, row, 0);
    const categoryId = requiredId(tables, row, 1);
    const category = preferenceLevels.get(categoryId);
    if (!category) throw new Error(`Unknown preference category ${categoryId}`);
    const key = `${neighborId}:${category.level}`;
    const sourceFields = Object.values(preferenceLayout).map(([field]) => field);
    if (!neighborIds.has(neighborId)) {
      exclusions.push({
        kind: "giftPreference",
        key,
        reason: "not_in_allowlist",
        sources: [tableSource(row, sourceFields)],
      });
      continue;
    }

    const categoryName = tables.string(row, 2);
    if (categoryName !== category.name)
      throw new Error(`Preference category label mismatch ${key}/${categoryName}`);
    const itemIdsForPreference = parseIds(tables.string(row, 3), `${key}.items`);
    const tagIds = parseIds(tables.string(row, 4), `${key}.tags`);
    for (const id of itemIdsForPreference)
      if (!itemIds.has(id)) throw new Error(`Unknown preference item ${key}/${id}`);
    for (const id of tagIds) {
      if (!tagCatalog.tags.has(id)) throw new Error(`Unknown preference GameplayTag ${key}/${id}`);
      usedTagIds.add(id);
    }
    preferences.push({
      key,
      npcId: neighborId,
      level: category.level,
      itemIds: itemIdsForPreference,
      tagIds,
    });
    records.push(evidence("giftPreferences", key, row, sourceFields));
  }

  const tags = [...usedTagIds]
    .sort((a, b) => a - b)
    .map((id) => {
      const tag = tagCatalog.tags.get(id)!;
      const key = String(id);
      records.push({ collection: "giftPreferenceTags", key, source: tagCatalog.sources.tree });
      records.push({ collection: "giftPreferenceTags", key, source: tagCatalog.sources.display });
      if (tag.textId !== null) {
        const text = tables.textmap[hashTextKey(tag.textId)];
        if (text?.nameZh)
          records.push({
            collection: "giftPreferenceTags",
            key,
            source: {
              kind: "table",
              file: "prepared/ed.obb",
              table: profile.roots.textmap,
              rowOffset: text.rowOffset,
              fields: [profile.fields.textmap.zh],
            },
          });
      }
      return { id, internalName: tag.internalName, nameZh: tag.nameZh };
    });
  return { preferences, tags };
}
