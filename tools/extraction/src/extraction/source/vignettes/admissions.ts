import assert from "node:assert/strict";
import { z } from "zod";
import { IdSchema } from "@loomix/schema/common";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { Tables } from "../decode/tables.ts";
import type { DiscoveryEvidence } from "./inputs.ts";
import { vignetteFields, vignetteTables } from "./profile.ts";

const levelCondition = z.strictObject({
  thresh: z.literal(1).optional(),
  habitatArchitectLevelGreaterOrEqual: z.strictObject({ level: IdSchema }),
});
const completionCondition = z.strictObject({
  thresh: z.literal(1).optional(),
  habitatRestored: z.strictObject({ habitatId: IdSchema }),
});

export interface VignetteCandidate {
  id: number;
  name: string;
  discoveryKey: number | null;
}

export type VignetteDecision =
  | { kind: "architectLevel"; level: number }
  | { kind: "task"; taskId: number }
  | { kind: "prerequisite"; templateId: number }
  | { kind: "test" | "unconfirmed" };

interface Admission {
  decision: VignetteDecision;
  sources: EvidenceSource[];
}

export const admitted = ({ kind }: VignetteDecision): boolean =>
  kind !== "test" && kind !== "unconfirmed";

export function resolveVignetteAdmissions(
  candidates: readonly VignetteCandidate[],
  levels: ReadonlyMap<number, EvidenceSource>,
  evidence: DiscoveryEvidence,
): Map<number, Admission> {
  const admissions = new Map<number, Admission>();
  const prerequisites = new Map<number, { templateId: number; source: EvidenceSource }>();
  for (const candidate of candidates) {
    const { id, name, discoveryKey } = candidate;
    if (/\(test\)/i.test(name)) {
      admissions.set(id, { decision: { kind: "test" }, sources: [] });
      continue;
    }
    const task = evidence.task(id);
    if (task) {
      admissions.set(id, {
        decision: { kind: "task", taskId: task.taskId },
        sources: [task.source],
      });
      continue;
    }
    const tracker = discoveryKey === null ? undefined : evidence.tracker(discoveryKey);
    if (!tracker) continue;
    const levelResult = levelCondition.safeParse(tracker.condition);
    if (levelResult.success) {
      const { level } = levelResult.data.habitatArchitectLevelGreaterOrEqual;
      const source = levels.get(level);
      if (source)
        admissions.set(id, {
          decision: { kind: "architectLevel", level },
          sources: [tracker.source, source],
        });
      continue;
    }
    const completion = completionCondition.safeParse(tracker.condition);
    if (completion.success)
      prerequisites.set(id, {
        templateId: completion.data.habitatRestored.habitatId,
        source: tracker.source,
      });
  }

  let changed: boolean;
  do {
    changed = false;
    for (const [id, { templateId, source }] of prerequisites) {
      const predecessor = admissions.get(templateId);
      if (!predecessor || !admitted(predecessor.decision)) continue;
      admissions.set(id, { decision: { kind: "prerequisite", templateId }, sources: [source] });
      prerequisites.delete(id);
      changed = true;
    }
  } while (changed);

  for (const { id } of candidates)
    if (!admissions.has(id)) admissions.set(id, { decision: { kind: "unconfirmed" }, sources: [] });
  return admissions;
}

export function readVignetteAdmissionRows(tables: Tables, evidence: DiscoveryEvidence) {
  const { gameplay, display } = vignetteFields;
  const plays = tables.byId(vignetteTables.gameplay);
  const displays = tables.byId(vignetteTables.display);
  assert.equal(plays.size, displays.size, "Vignette gameplay/display coverage");
  const rows = [...displays.values()].map((shown) => {
    const id = tables.id(shown);
    const play = plays.get(id);
    assert.ok(play, `Missing vignette gameplay row ${id}`);
    const name = tables.text(shown, display.name);
    assert.ok(
      name && name === tables.text(play, gameplay.name),
      `Vignette template identity ${id}`,
    );
    return {
      id,
      name,
      play,
      shown,
      order: tables.uint(shown, display.order, 0),
      discoveryKey: tables.uint(play, gameplay.discoveryKey),
    };
  });
  const levels = new Map<number, EvidenceSource>(
    [...tables.byId(vignetteTables.architectLevels).values()].map((row) => [
      tables.id(row),
      {
        kind: "table",
        file: "prepared/ed.obb",
        table: row.root,
        rowOffset: row.rowOffset,
        fields: [0],
      },
    ]),
  );
  const admissions = resolveVignetteAdmissions(rows, levels, evidence);
  return rows.map((row) => ({ ...row, ...admissions.get(row.id)! }));
}
