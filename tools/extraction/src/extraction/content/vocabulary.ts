import type { RecordType } from "../schema.ts";
import type { TagNode, Row, TableRow } from "../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { TagDisplay, CreatureDisplayMap } from "../decode/bindata.ts";
import { profile } from "../../profile.ts";
import { splitTags } from "./model.ts";

export interface Subgroup {
  group: number;
  id: number;
  name: string | null;
  filters: string[];
}

export interface Vocabulary {
  tree: Record<number, TagNode>;
  qualityLabels: Map<number, string | null>;
  subgroups: Subgroup[];
  groupNames: Record<number, RecordType>;
  setTags: Record<string, RecordType>;
  sources: Map<number | null, TableRow>;
  furnitureTypes: TableRow[];
  cookware: TableRow[];
  scales: Map<number | null, TableRow>;
  difficulties: Map<number | null, TableRow>;
  cropsByProduct: Map<number, TableRow>;
  tags(row: Row, field: number): string[];
  translateTag(name: string): string | null;
  renderTags(values: string[]): string | null;
  renderDisplay(value: string | null): string | null;
}

const GROUP_NAMES: Record<number, RecordType> = {
  1: "creatures.item",
  2: "plants.item",
  3: "dishes.item",
  4: "furniture.item",
  5: "clothing.item",
  6: "miscellaneous.item",
};

const SET_TAGS: Record<string, RecordType> = {
  家具套组: "furniture.set",
  服装套组: "clothing.set",
  鱼套组: "creatures.series",
  昆虫套组: "creatures.series",
  赶海生物套组: "creatures.series",
  作物套组: "plants.series",
  花套组: "plants.series",
  烹饪套组: "dishes.series",
};

export function createVocabulary(
  tables: Tables,
  tree: Record<number, TagNode>,
  tagDisplay: TagDisplay,
  display: CreatureDisplayMap,
): Vocabulary {
  const tagByName = new Map(Object.values(tree).map((node) => [node.TagName, node]));
  const tagByEnum = new Map(
    Object.values(tree)
      .filter((node): node is TagNode & { EnumName: string } => !!node.EnumName)
      .map((node) => [node.EnumName, node]),
  );
  const translateTag = (name: string): string | null => {
    const id = tagByName.get(name)?.TagId;
    return tables.key(id == null ? null : tagDisplay[id]?.nameInGame?.textId) ?? null;
  };
  const tags = (row: Row, field: number) => splitTags(tables.string(row, field));
  const renderTags = (values: string[]): string | null => {
    const translated = values.map(translateTag);
    return values.length && translated.every(Boolean) ? [...new Set(translated)].join("，") : null;
  };
  const renderDisplay = (value: string | null): string | null => {
    const keys = splitTags(value);
    const values = keys.map((key) => {
      const node = tagByEnum.get(key.replace(/^CHabitat_/, ""));
      return (
        tables.key(display[key]?.textContent?.textId ?? key) ??
        tables.key(node ? tagDisplay[node.TagId]?.nameInGame?.textId : null) ??
        (key.startsWith("CHabitat_") && node ? tables.key(`TagDisplayName_${node.EnumName}`) : null)
      );
    });
    return keys.length && values.every(Boolean) ? [...new Set(values)].join("，") : null;
  };

  const qualityRows = tables.rows(profile.roots.qualities);
  const qualityLabels = new Map(
    qualityRows.map((row) => [tables.uint(row, 1, 0), tables.text(row, 2)]),
  );
  if (
    [...qualityLabels].some(([id, label]) => !Number.isInteger(id) || !label) ||
    qualityLabels.size !== 5
  )
    throw new Error("Quality enum changed");

  const subgroups = tables.rows(profile.roots.categories).map((row) => ({
    group: tables.id(row),
    id: tables.uint(row, 3, 0),
    name: tables.text(row, 4),
    filters: tags(row, 5),
  }));

  return {
    tree,
    qualityLabels,
    subgroups,
    groupNames: GROUP_NAMES,
    setTags: SET_TAGS,
    sources: tables.byId(profile.roots.sources),
    furnitureTypes: tables.rows(profile.roots.furnitureTypes),
    cookware: tables.rows(profile.roots.cookware),
    scales: tables.byId(profile.roots.creatureScale),
    difficulties: tables.byId(profile.roots.recipeDifficulty),
    cropsByProduct: buildCropByProduct(tables),
    tags,
    translateTag,
    renderTags,
    renderDisplay,
  };
}

function buildCropByProduct(tables: Tables): Map<number, TableRow> {
  const result = new Map<number, TableRow>();
  for (const row of tables.rows(profile.roots.crops))
    for (const id of tables.vector(row, profile.fields.crops.products) ?? []) {
      if (result.has(id)) throw new Error(`Duplicate crop product ${id}`);
      result.set(id, row);
    }
  return result;
}
