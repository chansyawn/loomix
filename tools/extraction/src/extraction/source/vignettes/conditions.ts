import assert from "node:assert/strict";
import type { Vignette } from "@loomix/schema/vignettes";

type Requirement = Vignette["requirements"][number];
type Target = Requirement["target"];

export function positiveInteger(token: string | undefined): number {
  const value = Number(token);
  assert.ok(
    token && /^[1-9]\d*$/.test(token) && Number.isSafeInteger(value),
    `Invalid positive integer: ${token}`,
  );
  return value;
}

export function targetReader(tagId: (name: string) => number | undefined) {
  return (token: string): Target => {
    if (/^\d+$/.test(token)) return { itemId: positiveInteger(token) };
    const allTagIds = token.split("&").map((name) => {
      const id = tagId(name);
      assert.ok(id !== undefined, `Unknown vignette tag: ${name}`);
      return id;
    });
    assert.equal(new Set(allTagIds).size, allTagIds.length, `Repeated vignette tag: ${token}`);
    return { allTagIds };
  };
}

type ReadTarget = ReturnType<typeof targetReader>;

function requirements(text: string, target: ReadTarget, display: boolean) {
  return text
    .replace(/;$/, "")
    .split(";")
    .map((clause) => {
      const [condition, examplesText, ...rest] = clause.split(":");
      assert.ok(
        !rest.length && (display || examplesText === undefined),
        `Invalid vignette clause: ${clause}`,
      );
      const [kind, ...parts] = condition.split(",").map((part) => part.trim());
      assert.ok(kind === "1" || kind === "2", `Unknown vignette requirement: ${clause}`);
      const support = kind === "2" ? target(parts.shift() ?? "") : null;
      const [subject, quantity, areaText, ...extra] = parts;
      assert.ok(subject && !extra.length, `Invalid vignette requirement: ${clause}`);
      const dimensions = areaText?.match(/^([1-9]\d*)\*([1-9]\d*)$/);
      assert.ok(areaText === undefined || dimensions, `Invalid vignette area: ${clause}`);
      const examples: Requirement["examples"] = [];
      if (examplesText !== undefined) {
        const values = examplesText.split(",").map((value) => positiveInteger(value.trim()));
        assert.equal(values.length % 2, 0, `Invalid vignette examples: ${clause}`);
        for (let index = 0; index < values.length; index += 2)
          examples.push({ itemId: values[index], quantity: values[index + 1] });
      }
      return {
        target: target(subject),
        support,
        quantity: positiveInteger(quantity),
        area: dimensions
          ? { width: positiveInteger(dimensions[1]), height: positiveInteger(dimensions[2]) }
          : null,
        examples,
      };
    });
}

export function readRequirements(
  id: number,
  configuredText: string,
  displayedText: string,
  labels: Vignette["name"],
  target: ReadTarget,
  seatTagId: number | undefined,
): Requirement[] {
  const configured = requirements(configuredText, target, false);
  const displayed = requirements(displayedText, target, true);
  const namesZh = labels.zh.split(";").map((name) => name.trim());
  const namesEn = labels.en.split(";").map((name) => name.trim());
  for (const count of [displayed.length, namesZh.length, namesEn.length])
    assert.equal(count, configured.length, `Vignette requirement count ${id}`);
  return configured.map(({ quantity, examples: _examples, ...shape }, index) => {
    const { quantity: shown, examples, ...displayShape } = displayed[index];
    assert.deepEqual(shape, displayShape, `Vignette requirement shape ${id}:${index}`);
    if (quantity !== shown) {
      assert.ok(
        id === 1007 &&
          quantity === 3 &&
          shown === 2 &&
          shape.support === null &&
          "allTagIds" in shape.target &&
          seatTagId !== undefined &&
          shape.target.allTagIds.length === 1 &&
          shape.target.allTagIds[0] === seatTagId,
        `Vignette requirement quantity ${id}:${index}`,
      );
    }
    return {
      ...shape,
      quantity: { configured: quantity, displayed: shown },
      label: { zh: namesZh[index], en: namesEn[index] },
      examples,
    };
  });
}

export function readPlacementRules(
  ids: number[],
  objectRule: string | null,
  target: ReadTarget,
  text: (id: number) => Vignette["name"] | null,
): Vignette["placementRules"] {
  assert.ok(
    ids[0] === 1 && new Set(ids).size === ids.length,
    "Invalid vignette placement rule list",
  );
  const objectIds = ids.filter((id) => id >= 2 && id <= 8);
  assert.equal(objectIds.length, objectRule ? 1 : 0, "Vignette object rule coverage");
  return ids.map((ruleId) => {
    const result = { ruleId, text: text(ruleId) };
    if (ruleId === 1) return { ...result, kind: "range" };
    if (ruleId === 9) return { ...result, kind: "align-water" };
    if (ruleId === 10) return { ...result, kind: "on-beach" };
    const [mode, ...objects] = (objectRule ?? "").split(",").map((part) => part.trim());
    if ([2, 3, 6, 7, 8].includes(ruleId)) {
      assert.ok(mode === "1" && objects.length >= 2, `Invalid adjacent rule: ${objectRule}`);
      return { ...result, kind: "adjacent", targets: objects.map(target) };
    }
    if (ruleId === 4 || ruleId === 5) {
      assert.ok(
        mode === "2" && objects.length === 2 && objects[1] === "水域",
        `Invalid near-water rule: ${objectRule}`,
      );
      return { ...result, kind: "near-water", target: target(objects[0]) };
    }
    throw new Error(`Unknown vignette placement rule ${ruleId}`);
  });
}
