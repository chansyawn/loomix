import assert from "node:assert/strict";
import type { Vignettes } from "@loomix/schema/vignettes";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { ClientReadRecords } from "../extraction/model.ts";
import type { ImageBinding, OriginalImage } from "../extraction/images/model.ts";
import { admitted, readVignetteAdmissionRows } from "../extraction/source/vignettes/admissions.ts";
import type { DiscoveryEvidence } from "../extraction/source/vignettes/inputs.ts";

export function verifyVignettes(
  tables: Tables,
  discovery: DiscoveryEvidence,
  data: Vignettes,
  observed: ClientReadRecords["vignettes"],
  bindings: readonly ImageBinding[],
  originals: readonly OriginalImage[],
): void {
  const admissions = readVignetteAdmissionRows(tables, discovery);
  const templates = new Map(data.templates.map((entry) => [entry.id, entry]));
  const recordedRows = new Map(observed.rows.map((entry) => [entry.id, entry]));
  const imageBindings = new Map(bindings.map(({ use, object }) => [use, object]));
  const originalIds = new Set(originals.map(({ object }) => object));
  assert.deepEqual(
    [...templates.keys()].sort((left, right) => left - right),
    admissions
      .filter(({ decision }) => admitted(decision))
      .map(({ id }) => id)
      .sort((left, right) => left - right),
    "Vignette admission coverage",
  );
  assert.equal(observed.rows.length, admissions.length, "Vignette observation coverage");
  for (const { id, shown: row, play, order, discoveryKey, decision, sources } of admissions) {
    const expected = tables.textmap[tables.uint(row, 1, 0)];
    const recorded = recordedRows.get(id);
    assert.ok(recorded, `Missing vignette observation ${id}`);
    assert.deepEqual(recorded.decision, decision, `Vignette admission decision ${id}`);
    assert.deepEqual(recorded.discoverySources, sources, `Vignette admission sources ${id}`);
    assert.equal(recorded.order, order, `Vignette source order ${id}`);
    assert.equal(recorded.discoveryKey, discoveryKey, `Vignette source discovery key ${id}`);
    const template = templates.get(id);
    if (!template) continue;
    assert.deepEqual(
      template.name,
      { zh: expected.nameZh, en: expected.nameEn },
      `Vignette localized name ${id}`,
    );
    assert.equal(template.stars, tables.uint(play, 5), `Vignette stars ${id}`);
    assert.deepEqual(
      [template.footprint.width, template.footprint.height],
      tables.vector(play, 4),
      `Vignette footprint ${id}`,
    );
    assert.deepEqual(
      template.placementRules.map(({ ruleId }) => ruleId),
      tables.vector(row, 8),
      `Vignette rule sequence ${id}`,
    );
    const creature = tables.string(play, 12)?.split(",")[0];
    const neighbor = tables.uint(play, 14);
    assert.deepEqual(
      template.creatureItemIds,
      creature ? [Number(creature)] : [],
      `Vignette creature link ${id}`,
    );
    assert.deepEqual(
      template.neighborIds,
      neighbor === null ? [] : [neighbor],
      `Vignette neighbor link ${id}`,
    );
    assert.equal(
      imageBindings.get(`vignette:${id}:illustration`),
      template.illustration.assetId,
      `Vignette exact image binding ${id}`,
    );
    assert.ok(originalIds.has(template.illustration.assetId), `Vignette image original ${id}`);
  }
}
