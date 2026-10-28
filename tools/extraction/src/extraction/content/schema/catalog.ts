import { z } from "zod";
import {
  CatalogSourceSchema,
  createCatalogRecordSchema,
  DeliveredImageSchema,
  attributeSchemas,
  IngredientCategorySchema,
  IngredientExpressionSchema,
  recordSchemas,
} from "./records.ts";
import type { CatalogRecord, CatalogSource, RecordType } from "./records.ts";
export function createCatalogSchema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  return z
    .strictObject({
      schemaVersion: z.literal(1),
      source: CatalogSourceSchema,
      ingredientCategories: IngredientCategorySchema.array(),
      items: createCatalogRecordSchema(image).array(),
    })
    .superRefine((catalog, ctx) => {
      const records = new Map<number, CatalogRecord>();
      catalog.items.forEach((record, index) => {
        if (records.has(record.id))
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "id"],
            message: `Duplicate item ID ${record.id}`,
          });
        records.set(record.id, record);
      });
      catalog.items.forEach((record, index) => {
        if (!("memberIds" in record)) return;
        const seen = new Set<number>();
        (record.memberIds ?? []).forEach((id, memberIndex) => {
          const path = ["items", index, "memberIds", memberIndex];
          if (seen.has(id))
            ctx.addIssue({ code: "custom", path, message: `Duplicate member ID ${id}` });
          const member = records.get(id);
          if (!member || member.category !== record.category || member.kind !== "item")
            ctx.addIssue({
              code: "custom",
              path,
              message: `Member ${id} must be an item in ${record.category}`,
            });
          seen.add(id);
        });
      });
      const categories = new Map<number, z.infer<typeof IngredientCategorySchema>>();
      const categoryNames = new Set<string>();
      catalog.ingredientCategories.forEach((category, index) => {
        if (categories.has(category.id))
          ctx.addIssue({
            code: "custom",
            path: ["ingredientCategories", index, "id"],
            message: `Duplicate ingredient category ID ${category.id}`,
          });
        categories.set(category.id, category);
        if (categoryNames.has(category.tagName))
          ctx.addIssue({
            code: "custom",
            path: ["ingredientCategories", index, "tagName"],
            message: `Duplicate ingredient tag ${category.tagName}`,
          });
        categoryNames.add(category.tagName);
        const seen = new Set<number>();
        category.itemIds.forEach((id, itemIndex) => {
          if (seen.has(id))
            ctx.addIssue({
              code: "custom",
              path: ["ingredientCategories", index, "itemIds", itemIndex],
              message: `Duplicate ingredient item ID ${id}`,
            });
          const record = records.get(id);
          if (!record || record.kind !== "item")
            ctx.addIssue({
              code: "custom",
              path: ["ingredientCategories", index, "itemIds", itemIndex],
              message: `Ingredient ${id} must be a catalog item`,
            });
          if (itemIndex > 0 && category.itemIds[itemIndex - 1]! >= id)
            ctx.addIssue({
              code: "custom",
              path: ["ingredientCategories", index, "itemIds", itemIndex],
              message: "Ingredient item IDs must be sorted and unique",
            });
          seen.add(id);
        });
        if (category.parentId === category.id)
          ctx.addIssue({
            code: "custom",
            path: ["ingredientCategories", index, "parentId"],
            message: "Ingredient category cannot be its own parent",
          });
      });
      catalog.ingredientCategories.forEach((category, index) => {
        if (category.parentId !== null && !categories.has(category.parentId))
          ctx.addIssue({
            code: "custom",
            path: ["ingredientCategories", index, "parentId"],
            message: `Unknown ingredient parent ${category.parentId}`,
          });
        const visited = new Set<number>();
        let current: number | null = category.id;
        while (current !== null) {
          if (visited.has(current)) {
            ctx.addIssue({
              code: "custom",
              path: ["ingredientCategories", index, "parentId"],
              message: "Ingredient category parent cycle",
            });
            break;
          }
          visited.add(current);
          current = categories.get(current)?.parentId ?? null;
        }
      });
      const validateExpression = (
        value: z.infer<typeof IngredientExpressionSchema>,
        path: (string | number)[],
      ) => {
        if (value.kind === "category" && !categories.has(value.categoryId))
          ctx.addIssue({
            code: "custom",
            path: [...path, "categoryId"],
            message: `Unknown ingredient category ${value.categoryId}`,
          });
        if (value.kind !== "category")
          value.terms.forEach((term, termIndex) =>
            validateExpression(term, [...path, "terms", termIndex]),
          );
      };
      catalog.items.forEach((record, index) => {
        if (record.category !== "dishes" || record.kind !== "item" || record.recipe === null)
          return;
        const slotFields = new Set<number>();
        record.recipe.slots?.forEach((slot, slotIndex) => {
          const path = ["items", index, "recipe", "slots", slotIndex];
          if (slotFields.has(slot.field))
            ctx.addIssue({
              code: "custom",
              path: [...path, "field"],
              message: `Duplicate recipe slot field ${slot.field}`,
            });
          slotFields.add(slot.field);
          if (slot.expression === null) {
            if (slot.itemIds !== null)
              ctx.addIssue({
                code: "custom",
                path: [...path, "itemIds"],
                message: "Unknown expression requires null itemIds",
              });
          } else {
            validateExpression(slot.expression, [...path, "expression"]);
            const seen = new Set<number>();
            if (slot.itemIds === null)
              ctx.addIssue({
                code: "custom",
                path: [...path, "itemIds"],
                message: "Known expression requires itemIds",
              });
            else {
              const itemIds = slot.itemIds;
              itemIds.forEach((id, itemIndex) => {
                if (seen.has(id))
                  ctx.addIssue({
                    code: "custom",
                    path: [...path, "itemIds", itemIndex],
                    message: `Duplicate recipe item ID ${id}`,
                  });
                const item = records.get(id);
                if (!item || item.kind !== "item")
                  ctx.addIssue({
                    code: "custom",
                    path: [...path, "itemIds", itemIndex],
                    message: `Recipe candidate ${id} must be a catalog item`,
                  });
                if (itemIndex > 0 && itemIds[itemIndex - 1]! >= id)
                  ctx.addIssue({
                    code: "custom",
                    path: [...path, "itemIds", itemIndex],
                    message: "Recipe item IDs must be sorted and unique",
                  });
                seen.add(id);
              });
            }
          }
        });
      });
    });
}
export const CatalogSchema = createCatalogSchema();
export type Catalog = z.infer<typeof CatalogSchema>;
export function parseCatalog(input: unknown): Catalog {
  return CatalogSchema.parse(input);
}
export function emptyCatalog(source: CatalogSource): Catalog {
  return { schemaVersion: 1, source: { ...source }, ingredientCategories: [], items: [] };
}
export function recordType(record: Pick<CatalogRecord, "category" | "kind">): RecordType {
  return `${record.category}.${record.kind}` as RecordType;
}
export const recordTypes = Object.keys(recordSchemas) as RecordType[];
export function recordFields(type: RecordType): string[] {
  const fields = Object.keys(recordSchemas[type].shape).filter(
    (field) => field !== "encyclopediaEntry" && field !== "attributes",
  );
  if (type.endsWith(".item")) {
    const category = type.split(".")[0] as CatalogRecord["category"];
    fields.push(
      ...Object.keys(attributeSchemas[category].shape).map((field) => `attributes.${field}`),
    );
  }
  return fields;
}
export function recordField(record: CatalogRecord, field: string): unknown {
  if (field.startsWith("attributes.") && record.kind === "item")
    return Reflect.get(record.attributes, field.slice(11));
  return Reflect.get(record, field);
}
