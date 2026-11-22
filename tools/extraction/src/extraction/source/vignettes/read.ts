import assert from "node:assert/strict";
import type { Vignette, Vignettes } from "@loomix/schema/vignettes";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { FieldEvidence, EvidenceSource } from "../../evidence/domain-schema.ts";
import type { TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import type { imageCollector } from "../images.ts";
import { admitted } from "./admissions.ts";
import type { VignetteAdmissions } from "./admissions.ts";
import {
  positiveInteger,
  readPlacementRules,
  readRequirements,
  targetReader,
} from "./conditions.ts";
import { vignetteAdmissionsFile, vignetteFields, vignetteTables } from "./profile.ts";

const { gameplay, display } = vignetteFields;
const file = "prepared/ed.obb";
const table = (row: TableRow, ...fields: number[]): EvidenceSource => ({
  kind: "table",
  file,
  table: row.root,
  rowOffset: row.rowOffset,
  fields,
});

function localized(tables: Tables, hash: number | null) {
  const entry = hash === null ? undefined : tables.textmap[hash];
  const zh = entry?.nameZh?.trim();
  const en = entry?.nameEn?.trim();
  assert.ok(entry && zh && en, `Missing vignette text ${hash}`);
  return {
    text: { zh, en },
    source: {
      kind: "table",
      file,
      table: 1,
      rowOffset: entry.rowOffset,
      fields: [0, 1],
    } satisfies EvidenceSource,
  };
}

function cleanText(text: Vignette["name"]): Vignette["name"] {
  const clean = (value: string) => value.replace(/<\/?style(?:=[^>]+)?>|\{[^{}]+\}/g, "").trim();
  return { zh: clean(text.zh), en: clean(text.en) };
}

function proof(
  collection: string,
  id: number,
  fieldPath: string,
  sources: EvidenceSource[],
): FieldEvidence {
  return {
    entity: { collection, id },
    fieldPath,
    sources,
    status: "confirmed",
    ruleId: "client.vignettes.configuration",
    reasonCode: null,
  };
}

export function readVignettes(
  tables: Tables,
  tags: GameplayTagIndex,
  admissions: VignetteAdmissions,
  images: Pick<ReturnType<typeof imageCollector>, "configured">,
) {
  const plays = tables.byId(vignetteTables.gameplay);
  const displays = tables.byId(vignetteTables.display);
  const rules = tables.byId(vignetteTables.rules);
  const items = tables.byId(318);
  const creatures = new Set(tables.rows(186).map((row) => tables.id(row)));
  const neighbors = new Set(tables.rows(41).map((row) => tables.id(row)));
  const tagId = (name: string) => tags.findByName(name)?.id;
  const target = targetReader(tagId);
  const templates: (Omit<Vignette, "illustration"> & { illustration: { use: string } })[] = [];
  const candidates = new Map<number, Vignettes["fallbackItems"][number]>();
  const proofs: FieldEvidence[] = [];
  assert.equal(
    displays.size,
    admissions.data.entries.length,
    "Vignette display admission coverage",
  );
  assert.equal(plays.size, admissions.data.entries.length, "Vignette gameplay admission coverage");
  const observe = admissions.data.entries.map(
    ([id, expectedName, order, discoveryKey, decision], index) => {
      const play = plays.get(id);
      const shown = displays.get(id);
      assert.ok(play && shown, `Missing vignette source rows ${id}`);
      const playName = localized(tables, tables.uint(play, gameplay.name));
      const shownName = localized(tables, tables.uint(shown, display.name));
      assert.equal(playName.text.zh, expectedName, `Vignette gameplay name ${id}`);
      assert.equal(shownName.text.zh, expectedName, `Vignette display name ${id}`);
      assert.equal(tables.uint(shown, display.order), order, `Vignette display order ${id}`);
      assert.equal(
        tables.uint(play, gameplay.discoveryKey),
        discoveryKey,
        `Vignette discovery key ${id}`,
      );
      assert.equal(
        expectedName.includes("(test)"),
        decision.kind === "test",
        `Vignette test marker ${id}`,
      );
      const neighborId = tables.uint(play, gameplay.neighbor);
      const ecology = tables.string(play, gameplay.creature);
      const preview = tables.string(play, gameplay.preview);
      const reference = tables.string(shown, display.image);
      assert.ok(preview && reference, `Missing vignette preview or image ${id}`);
      const observation = {
        id,
        order,
        discoveryKey,
        decision,
        gameplayName: playName.text,
        displayName: shownName.text,
        ecology,
        preview,
        image: reference,
      };
      if (!admitted(decision)) return observation;

      const admissionSource: EvidenceSource = {
        kind: "manual",
        file: vignetteAdmissionsFile,
        pointer: `/entries/${index}`,
        sha256: admissions.sha256,
      };
      const admissionSources: EvidenceSource[] = [
        admissionSource,
        table(shown, display.name, display.order),
      ];
      if ("textId" in decision) {
        const named = localized(tables, decision.textId);
        const normalized = named.text.zh.replace(/<[^>]+>/g, "").replaceAll("小栖地", "地");
        assert.ok(normalized.includes(expectedName), `Vignette admission text does not name ${id}`);
        admissionSources.push(named.source);
      }
      if (decision.kind === "neighbor") {
        assert.equal(neighborId, decision.neighborId, `Vignette admission neighbor ${id}`);
        admissionSources.push(table(play, gameplay.neighbor));
      }

      const footprint = tables.vector(play, gameplay.footprint);
      assert.ok(
        footprint?.length === 2 && footprint.every((value) => value > 0),
        `Invalid vignette footprint ${id}`,
      );
      const [width, height] = footprint;
      const stars = tables.uint(play, gameplay.stars);
      assert.ok(stars && stars <= 3, `Invalid vignette stars ${id}`);
      const siteCode = tables.uint(play, gameplay.site);
      assert.ok(siteCode === 1 || siteCode === 2 || siteCode === 4, `Unknown vignette site ${id}`);
      const site = siteCode === 1 ? "land" : siteCode === 2 ? "water-edge" : "beach";
      const ground = siteCode === 1 ? "Grass" : siteCode === 2 ? "WaterNGrass" : "Sand";
      assert.ok(
        tables.string(shown, display.ground)?.endsWith(`_${ground}_${width}x${height}.prefab`),
        `Vignette ground ${id}`,
      );
      const configured = tables.string(play, gameplay.requirements);
      const displayed = tables.string(shown, display.requirements);
      assert.ok(configured && displayed, `Missing vignette requirements ${id}`);
      const labels = localized(tables, tables.uint(shown, display.labels));
      const requirements = readRequirements(
        id,
        configured,
        displayed,
        labels.text,
        target,
        tagId("座椅"),
      );
      const ruleIds = tables.vector(shown, display.rules);
      assert.ok(
        ruleIds &&
          ruleIds.includes(9) === (siteCode === 2) &&
          ruleIds.includes(10) === (siteCode === 4),
        `Vignette site rules ${id}`,
      );
      const ruleSources: EvidenceSource[] = [];
      const placementRules = readPlacementRules(
        ruleIds,
        tables.string(play, gameplay.objectRule),
        target,
        (ruleId) => {
          const rule = rules.get(ruleId);
          assert.ok(rule, `Missing vignette rule ${ruleId}`);
          const hash = tables.uint(rule, 3, 0);
          ruleSources.push(table(rule, 0, 3));
          if (!hash) return null;
          const label = localized(tables, hash);
          ruleSources.push(label.source);
          return label.text;
        },
      );
      const creatureId = ecology ? positiveInteger(ecology.split(",")[0]) : null;
      if (creatureId !== null)
        assert.ok(
          creatures.has(creatureId) && items.has(creatureId),
          `Unknown vignette creature ${creatureId}`,
        );
      if (neighborId !== null)
        assert.ok(neighbors.has(neighborId), `Unknown vignette neighbor ${neighborId}`);
      const hints: Vignette["hints"] = [];
      const hintSources: EvidenceSource[] = [];
      for (const [
        hintIndex,
        [templateId, kind, hash, excerpt],
      ] of admissions.data.hints.entries()) {
        if (templateId !== id) continue;
        const entry = localized(tables, hash);
        const cleaned = cleanText(entry.text);
        if (excerpt)
          assert.ok(
            cleaned.zh.includes(excerpt.zh) && cleaned.en.includes(excerpt.en),
            `Vignette hint excerpt ${id}:${hash}`,
          );
        hints.push({ kind, text: excerpt ?? cleaned });
        hintSources.push(entry.source, { ...admissionSource, pointer: `/hints/${hintIndex}` });
      }
      for (const itemId of vignetteObjectIds({ requirements, placementRules })) {
        if (candidates.has(itemId)) continue;
        const row = items.get(itemId);
        assert.ok(row, `Unknown vignette item ${itemId}`);
        const name = localized(tables, tables.uint(row, 1));
        candidates.set(itemId, { id: itemId, name: name.text });
        proofs.push(
          proof("vignettes.fallbackItems", itemId, "name", [table(row, 0, 1), name.source]),
        );
      }
      const imageSources = [table(shown, display.image)];
      const use = images.configured(
        { kind: "vignette", id, field: "illustration" },
        reference,
        "illustration",
        imageSources,
        true,
      );
      templates.push({
        id,
        name: shownName.text,
        illustration: { use },
        stars,
        footprint: { width, height },
        site,
        requirements,
        placementRules,
        creatureItemIds: creatureId === null ? [] : [creatureId],
        neighborIds: neighborId === null ? [] : [neighborId],
        hints,
      });
      const sourcesByField = {
        name: [table(shown, display.name), shownName.source, ...admissionSources],
        stars: [table(play, gameplay.stars)],
        footprint: [table(play, gameplay.footprint), table(shown, display.ground)],
        site: [table(play, gameplay.site), table(shown, display.ground, display.rules)],
        requirements: [
          table(play, gameplay.requirements),
          table(shown, display.labels, display.requirements),
          labels.source,
        ],
        placementRules: [
          table(play, gameplay.objectRule),
          table(shown, display.rules),
          ...ruleSources,
        ],
        creatureItemIds: [table(play, gameplay.creature)],
        neighborIds: [table(play, gameplay.neighbor)],
        hints: [admissionSource, ...hintSources],
      };
      for (const [field, sources] of Object.entries(sourcesByField))
        proofs.push(proof("vignettes.templates", id, field, sources));
      return observation;
    },
  );

  return {
    templates: templates.sort((left, right) => left.id - right.id),
    candidates: [...candidates.values()].sort((left, right) => left.id - right.id),
    proofs,
    rows: observe,
  };
}

export function vignetteTargets(template: Pick<Vignette, "requirements" | "placementRules">) {
  return [
    ...template.requirements.flatMap(({ target, support }) =>
      support ? [target, support] : [target],
    ),
    ...template.placementRules.flatMap((rule) =>
      rule.kind === "adjacent" ? rule.targets : rule.kind === "near-water" ? [rule.target] : [],
    ),
  ];
}

export function vignetteObjectIds(template: Pick<Vignette, "requirements" | "placementRules">) {
  return [
    ...vignetteTargets(template).flatMap((target) => ("itemId" in target ? [target.itemId] : [])),
    ...template.requirements.flatMap(({ examples }) => examples.map(({ itemId }) => itemId)),
  ];
}
