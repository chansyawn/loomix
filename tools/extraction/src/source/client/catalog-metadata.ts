import { RECORD_TAG_FIELD_NAMES, mergeRecordTagIds } from "@loomix/schema/catalog";
import type { CatalogRecord, ClientType, RecordTagFields } from "@loomix/schema/catalog";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { Tables } from "../../extraction/decode/tables.ts";
import type { TableRow } from "../../extraction/types.ts";
import type { FieldEvidence } from "../../extraction/evidence/domain-schema.ts";
import { splitTags } from "../../extraction/content/model.ts";
import { profile } from "../../profile.ts";

const tagSourceFields = {
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
} satisfies Record<keyof RecordTagFields, number>;

type Metadata = Pick<CatalogRecord, "client" | "tagFields" | "tagIds">;
type FieldProof = Pick<FieldEvidence, "fieldPath" | "status" | "sources" | "ruleId" | "reasonCode">;
type MetadataTables = Pick<Tables, "byId" | "string" | "uint" | "fields">;

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
  const proof = (
    row: TableRow,
    fieldPath: string,
    field: number,
    absent = false,
    defaulted = false,
  ): FieldProof => ({
    fieldPath,
    status: absent ? "absent" : "confirmed",
    sources: [source(row, [field])],
    ruleId: defaulted ? "client.catalog.uint_default_zero" : "client.catalog.exact_metadata",
    reasonCode: absent ? "not_configured" : null,
  });
  const clientTypes: ClientType[] = [...typeRows]
    .map(([id, row]) => {
      if (id === null) throw new Error("Missing BTypeCfg ID");
      return {
        id,
        name: tables.string(row, profile.fields.types.name) || null,
        tagIds: parseTags(row, id, profile.fields.types.typetag),
      };
    })
    .sort((a, b) => a.id - b.id);
  const types = new Map(clientTypes.map((entry) => [entry.id, entry]));
  const clientTypeProofs = (id: number): FieldProof[] => {
    const row = typeRows.get(id);
    const type = types.get(id);
    if (!row || !type) throw new Error(`Missing BTypeCfg type ${id}`);
    return [
      proof(row, "id", profile.fields.types.id),
      proof(row, "name", profile.fields.types.name, type.name === null),
      proof(row, "tagIds", profile.fields.types.typetag, type.tagIds.length === 0),
    ];
  };
  const cache = new Map<number, { value: Metadata; proofs: FieldProof[] }>();
  // 仅在正式记录请求时解析标签，范围外引用中的脏值不参与目录构建。
  const record = (id: number) => {
    const cached = cache.get(id);
    if (cached) return cached;
    const row = main.get(id);
    if (!row) throw new Error(`Missing BIdCfg 318 item ${id}`);
    const client = {
      type: tables.uint(row, profile.fields.items.type, 0),
      idType: tables.uint(row, profile.fields.items.idType, 0),
      subtype: tables.uint(row, profile.fields.items.subtype, 0),
      subtypeName: tables.string(row, profile.fields.items.subtypeName) || null,
    };
    const type = types.get(client.type);
    const typeRow = typeRows.get(client.type);
    if (!type || !typeRow)
      throw new Error(`Missing BTypeCfg 716 type ${client.type} for BIdCfg 318.2 item ${id}`);
    const tagFields = Object.fromEntries(
      RECORD_TAG_FIELD_NAMES.map((field) => [field, parseTags(row, id, tagSourceFields[field])]),
    ) as RecordTagFields;
    const tagIds = mergeRecordTagIds(tagFields, type.tagIds);
    const proofs = [
      ...(["type", "idType", "subtype", "subtypeName"] as const).map((field) => {
        const sourceField = profile.fields.items[field];
        return proof(
          row,
          `client.${field}`,
          sourceField,
          client[field] === null,
          field !== "subtypeName" && tables.fields(row)[sourceField] == null,
        );
      }),
      ...RECORD_TAG_FIELD_NAMES.map((field) =>
        proof(row, `tagFields.${field}`, tagSourceFields[field], tagFields[field].length === 0),
      ),
      {
        fieldPath: "tagIds",
        status: tagIds.length ? ("confirmed" as const) : ("absent" as const),
        sources: [
          source(row, [
            profile.fields.items.type,
            ...RECORD_TAG_FIELD_NAMES.map((field) => tagSourceFields[field]),
          ]),
          source(typeRow, [profile.fields.types.id, profile.fields.types.typetag]),
        ],
        ruleId: "client.catalog.ordered_tag_union",
        reasonCode: tagIds.length ? null : "not_configured",
      },
    ];
    const result = { value: { client, tagFields, tagIds }, proofs };
    cache.set(id, result);
    return result;
  };
  return { clientTypes, clientTypeProofs, record };
}
