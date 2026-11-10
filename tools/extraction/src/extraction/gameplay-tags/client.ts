import path from "node:path";
import { createGameplayTagIndex, GameplayTagSchema } from "@loomix/schema/gameplay-tags";
import type { GameplayTag } from "@loomix/schema/gameplay-tags";
import type { TagNode, BinDataAsset } from "../types.ts";
import type { TagDisplay } from "../decode/bindata.ts";
import { parseTagBinData } from "../decode/bindata.ts";
import { hashTextKey } from "../decode/tables.ts";
import type { Tables } from "../decode/tables.ts";
import { readJson } from "../../workflow/json.ts";
import { profile } from "../../profile.ts";
import type { EvidenceSource } from "../evidence/domain-schema.ts";

export function createClientGameplayTags(
  tree: Record<number, TagNode>,
  display: TagDisplay,
  tables: Pick<Tables, "key">,
) {
  const tags: GameplayTag[] = Object.entries(tree)
    .map(([key, node]) => {
      if (String(node.TagId) !== key) throw new Error(`GameplayTag key mismatch ${key}`);
      return GameplayTagSchema.parse({
        id: node.TagId,
        internalName: node.TagName,
        enumName: node.EnumName ?? null,
        parentId: node.ParentId === 4294967295 ? null : node.ParentId,
        displayName: tables.key(display[node.TagId]?.nameInGame?.textId),
      });
    })
    .sort((a, b) => a.id - b.id);
  return { tags, index: createGameplayTagIndex(tags) };
}

export function loadClientGameplayTags(work: string, tables: Tables) {
  const manifests = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const asset = (name: string) => {
    const entry = manifests.find((value) => value.Name === name);
    if (!entry) throw new Error(`Missing GameplayTag asset ${name}`);
    return { entry, value: readJson(path.resolve(work, entry.file)) };
  };
  const treeAsset = asset(profile.binData.tags);
  const displayAsset = asset(profile.binData.tagDisplay);
  const { tree, tagDisplay } = parseTagBinData(treeAsset.value, displayAsset.value);
  const catalog = createClientGameplayTags(tree, tagDisplay, tables);
  const sources = (id: number): EvidenceSource[] => {
    catalog.index.get(id);
    const result: EvidenceSource[] = [treeAsset.entry, displayAsset.entry].map((entry) => ({
      kind: "asset",
      file: entry.Source,
      pathId: String(entry.PathID),
    }));
    const textId = tagDisplay[id]?.nameInGame?.textId;
    const text = textId ? tables.textmap[hashTextKey(textId)] : undefined;
    if (text?.nameZh)
      result.push({
        kind: "table",
        file: "prepared/ed.obb",
        table: profile.roots.textmap,
        rowOffset: text.rowOffset,
        fields: [profile.fields.textmap.zh],
      });
    return result;
  };
  return { ...catalog, sources };
}
export type ClientGameplayTags = ReturnType<typeof loadClientGameplayTags>;
