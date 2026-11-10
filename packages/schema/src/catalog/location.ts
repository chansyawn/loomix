import type { Catalog } from "./index.ts";
import { growthPlantIds } from "./growth.ts";

export type RecordTarget = { recordId: number; focus?: number };
export function recordTarget(
  catalog: Pick<Catalog, "records" | "growths">,
  id: number,
): RecordTarget | null {
  const record = catalog.records.find((record) => record.id === id);
  if (!record) return null;
  const seriesFor = (ids: number[]) => {
    const groups = catalog.records.filter(
      (record) =>
        record.type === "plants.series" &&
        ids.length > 0 &&
        ids.every((id) => record.memberIds?.includes(id)),
    );
    if (groups.length !== 1) throw new Error(`Ambiguous plant series for ${id}`);
    return { recordId: groups[0]!.id, focus: id };
  };
  if (record.type === "seed") {
    const growth = catalog.growths.find((growth) => growth.id === record.growthId);
    if (!growth) throw new Error(`Missing seed growth ${id}`);
    const plants = growthPlantIds(growth);
    if (growth.kind === "crop" || plants.length !== 1) return seriesFor(plants);
    const target = catalog.records.find((record) => record.id === plants[0]);
    if (target?.type !== "plant") throw new Error(`Missing seed plant ${id}`);
    return { recordId: target.id, focus: id };
  }
  if (record.type === "plant" && record.subcategory === "作物") return seriesFor([id]);
  return { recordId: id };
}
export function recordFocus(
  catalog: Pick<Catalog, "records" | "growths">,
  recordId: number,
  focus?: number,
) {
  if (focus === undefined || focus === recordId) return undefined;
  const candidate = catalog.records.find((record) => record.id === focus);
  if (
    candidate?.type !== "seed" &&
    !(candidate?.type === "plant" && candidate.subcategory === "作物")
  )
    return undefined;
  const target = recordTarget(catalog, focus);
  return target?.recordId === recordId ? focus : undefined;
}
