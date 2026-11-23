import assert from "node:assert/strict";
import type { Vignettes } from "@loomix/schema/vignettes";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { ClientReadRecords } from "../extraction/model.ts";
import type { ImageBinding, OriginalImage } from "../extraction/images/model.ts";
import { readVignetteAdmissions } from "../extraction/source/vignettes/admissions.ts";

export function verifyVignettes(
  source: string,
  tables: Tables,
  data: Vignettes,
  observed: ClientReadRecords["vignettes"],
  bindings: readonly ImageBinding[],
  originals: readonly OriginalImage[],
): void {
  const { data: admissions } = readVignetteAdmissions(source);
  const templates = new Map(data.templates.map((entry) => [entry.id, entry]));
  const display = tables.byId(291);
  const gameplay = tables.byId(288);
  const imageBindings = new Map(bindings.map(({ use, object }) => [use, object]));
  const originalIds = new Set(originals.map(({ object }) => object));
  assert.equal(observed.rows.length, 42, "Vignette observation coverage");
  assert.equal(templates.size, 31, "Vignette template coverage");
  assert.equal(display.size, admissions.entries.length, "Vignette display universe");
  assert.equal(gameplay.size, admissions.entries.length, "Vignette gameplay universe");
  for (const [id, name, order, key, evidence] of admissions.entries) {
    const row = display.get(id);
    const play = gameplay.get(id);
    assert.ok(row && play, `Vignette source row ${id}`);
    const expected = tables.textmap[tables.uint(row, 1, 0)];
    const recorded = observed.rows.find((candidate) => candidate.id === id);
    assert.ok(recorded, `Missing vignette observation ${id}`);
    assert.deepEqual(recorded.decision, evidence, `Vignette admission decision ${id}`);
    assert.equal(tables.text(play, 1), name, `Vignette gameplay name ${id}`);
    assert.equal(expected?.nameZh, name, `Vignette source name ${id}`);
    assert.equal(tables.uint(row, 4), order, `Vignette source order ${id}`);
    assert.equal(tables.uint(play, 2), key, `Vignette source discovery key ${id}`);
    const template = templates.get(id);
    assert.equal(
      Boolean(template),
      order >= 1 && order <= 31,
      `Vignette first-batch membership ${id}`,
    );
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
  assert.equal(
    data.templates.flatMap(({ creatureItemIds }) => creatureItemIds).length,
    6,
    "Vignette creature coverage",
  );
  assert.equal(
    data.templates.flatMap(({ neighborIds }) => neighborIds).length,
    10,
    "Vignette neighbor coverage",
  );
}
