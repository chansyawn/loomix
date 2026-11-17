import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { Tables } from "../../decode/tables.ts";
import type { TableRow } from "../../../types.ts";
import type { FieldEvidence } from "../../../evidence/domain-schema.ts";
import { splitTags } from "../model.ts";
import { profile } from "../../../../profile.ts";

// 物品直接标签的十二组来源，顺序决定合并后 tagIds 的顺序。
export const TAG_SOURCE_FIELDS = {
  type: profile.fields.items.tagType,
  showType: profile.fields.items.tagShowType,
  area: profile.fields.items.tagArea,
  color: profile.fields.items.tagColor,
  creature: profile.fields.items.tagCreature,
  material: profile.fields.items.tagMaterial,
  style: profile.fields.items.tagStyle,
  property: profile.fields.items.tagProperty,
  size: profile.fields.items.tagSize,
  ingredients: profile.fields.items.tagIngredients,
  foodMaterials: profile.fields.items.tagFoodMaterials,
  npcFurnitureCategory: profile.fields.items.tagNpcFurnitureCategory,
} as const;
export type TagSourceField = keyof typeof TAG_SOURCE_FIELDS;
export const TAG_SOURCE_FIELD_NAMES = Object.keys(TAG_SOURCE_FIELDS) as TagSourceField[];

type FieldProof = Pick<FieldEvidence, "fieldPath" | "status" | "sources" | "ruleId" | "reasonCode">;
type MetadataTables = Pick<Tables, "byId" | "string" | "uint">;

export interface RecordTagSources {
  fields: Record<TagSourceField, number[]>;
  typeTagIds: number[];
  tagIds: number[];
}

export function readCatalogMetadata(tables: MetadataTables, tags: GameplayTagIndex) {
  const main = tables.byId(profile.roots.items);
  const typeRows = tables.byId(profile.roots.types);
  const source = (row: TableRow, fields: number[]): FieldEvidence["sources"][number] => ({
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  });
  const parseTags = (row: TableRow, id: number, field: number): number[] => [
    ...new Set(
      splitTags(tables.string(row, field)).map((name) => {
        const tag = tags.findByName(name);
        if (!tag) throw new Error(`Unknown GameplayTag ${row.root}.${field} (ID ${id}): ${name}`);
        return tag.id;
      }),
    ),
  ];
  const typeTags = new Map(
    [...typeRows].map(([id, row]) => {
      if (id === null) throw new Error("Missing BTypeCfg ID");
      return [id, parseTags(row, id, profile.fields.types.typetag)] as const;
    }),
  );
  const cache = new Map<number, { value: RecordTagSources; proofs: FieldProof[] }>();
  // 仅在正式记录请求时解析标签，范围外引用中的脏值不参与目录构建。
  const record = (id: number) => {
    const cached = cache.get(id);
    if (cached) return cached;
    const row = main.get(id);
    if (!row) throw new Error(`Missing BIdCfg 318 item ${id}`);
    const type = tables.uint(row, profile.fields.items.type, 0);
    const typeRow = typeRows.get(type);
    const typeTagIds = typeTags.get(type);
    if (!typeRow || !typeTagIds)
      throw new Error(`Missing BTypeCfg 716 type ${type} for BIdCfg 318.2 item ${id}`);
    const fields = Object.fromEntries(
      TAG_SOURCE_FIELD_NAMES.map((field) => [field, parseTags(row, id, TAG_SOURCE_FIELDS[field])]),
    ) as Record<TagSourceField, number[]>;
    const tagIds = [
      ...new Set([...TAG_SOURCE_FIELD_NAMES.flatMap((f) => fields[f]), ...typeTagIds]),
    ];
    const proofs: FieldProof[] = [
      {
        fieldPath: "tagIds",
        status: tagIds.length ? "confirmed" : "absent",
        sources: [
          source(row, [profile.fields.items.type, ...Object.values(TAG_SOURCE_FIELDS)]),
          source(typeRow, [profile.fields.types.id, profile.fields.types.typetag]),
        ],
        ruleId: "client.catalog.ordered_tag_union",
        reasonCode: tagIds.length ? null : "not_configured",
      },
    ];
    const result = { value: { fields, typeTagIds, tagIds }, proofs };
    cache.set(id, result);
    return result;
  };
  return { typeTags, record };
}
