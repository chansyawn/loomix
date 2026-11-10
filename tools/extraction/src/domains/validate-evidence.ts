import type { Dataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";

export function validateDomainEvidence(dataset: Dataset, fields: FieldEvidence[]): FieldEvidence[] {
  const merged = new Map<string, FieldEvidence>();
  for (const proof of fields) {
    const [domain, name] = proof.entity.collection.split(".");
    if (
      domain !== "catalog" &&
      domain !== "neighbors" &&
      domain !== "world" &&
      domain !== "gameplayTags"
    )
      throw new Error(`Unknown evidence domain ${domain}`);
    const values: unknown = Reflect.get(dataset[domain], name!);
    const entity: unknown = Array.isArray(values)
      ? values.find(
          (value: unknown) =>
            value &&
            typeof value === "object" &&
            ["id", "key", "path"].some(
              (key) => String(Reflect.get(value, key)) === String(proof.entity.id),
            ),
        )
      : undefined;
    if (!entity)
      throw new Error(`Unknown evidence entity ${proof.entity.collection}:${proof.entity.id}`);
    if (proof.fieldPath !== "$") {
      let value: unknown = entity;
      for (const segment of proof.fieldPath.split(".")) {
        if (!value || typeof value !== "object" || !(segment in value))
          throw new Error(
            `Unknown evidence field ${proof.entity.collection}:${proof.entity.id}.${proof.fieldPath}`,
          );
        value = Reflect.get(value, segment);
      }
    }
    const key = `${proof.entity.collection}:${proof.entity.id}:${proof.fieldPath}`,
      previous = merged.get(key);
    if (previous) {
      if (previous.status !== proof.status) throw new Error(`Conflicting evidence status ${key}`);
      previous.sources = [
        ...new Map(
          [...previous.sources, ...proof.sources].map((source) => [JSON.stringify(source), source]),
        ).values(),
      ];
    } else
      merged.set(key, {
        ...proof,
        sources: [
          ...new Map(proof.sources.map((source) => [JSON.stringify(source), source])).values(),
        ],
      });
  }
  return [...merged.values()].sort((a, b) =>
    `${a.entity.collection}:${a.entity.id}:${a.fieldPath}`.localeCompare(
      `${b.entity.collection}:${b.entity.id}:${b.fieldPath}`,
      "en",
    ),
  );
}
