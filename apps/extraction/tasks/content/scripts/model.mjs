import assert from "node:assert/strict";

export const basicFields = ["name", "image", "description", "id", "quality"];
export const additionalFields = {
  "furniture.sets": ["seriesName", "componentIds"],
  "furniture.items": ["category", "type", "size", "colors", "materials", "sources"],
  "creatures.series": ["seriesName", "creatureIds"],
  "creatures.items": [
    "category",
    "region",
    "habitat",
    "activeSeasons",
    "activeTimes",
    "activeWeather",
    "sizeRange",
  ],
  "plants.series": ["seriesName", "plantIds"],
  "plants.items": ["category", "originGalaxy", "maturityPeriod", "harvestCount"],
  "dishes.series": ["seriesName", "dishIds"],
  "dishes.items": ["difficulty", "galaxyFlavor", "cookware", "effects"],
  "clothing.sets": ["setName", "componentIds"],
  "clothing.items": ["category", "colors", "materials", "styles", "sources"],
  "clothing.appearances": ["category"],
  miscellaneous: [],
};
export const memberTargets = {
  "furniture.sets": ["componentIds", "furniture.items"],
  "creatures.series": ["creatureIds", "creatures.items"],
  "plants.series": ["plantIds", "plants.items"],
  "dishes.series": ["dishIds", "dishes.items"],
  "clothing.sets": ["componentIds", "clothing.items"],
};
export function emptyContent() {
  return {
    furniture: { sets: [], items: [] },
    creatures: { series: [], items: [] },
    plants: { series: [], items: [] },
    dishes: { series: [], items: [] },
    clothing: { sets: [], items: [], appearances: [] },
    miscellaneous: [],
  };
}
export function groupAt(content, group) {
  return group.split(".").reduce((o, k) => o[k], content);
}
export function plainText(value) {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/\r\n/g, "\n")
        .trim() || null
    : null;
}
export function splitTags(value) {
  return value
    ? value
        .split(/[,;，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
export function furnitureSize(value) {
  const match = /^尺寸_(\d+(?:a\d+)?)_(\d+(?:a\d+)?)$/.exec(value ?? "");
  return match
    ? `${Number(match[1].replace("a", ".")).toFixed(1)}x${Number(match[2].replace("a", ".")).toFixed(1)}`
    : null;
}
export function expandTags(names, nodes) {
  const byName = new Map(Object.values(nodes).map((n) => [n.TagName, n]));
  const expanded = new Set(names);
  for (const name of names) {
    let node = byName.get(name);
    const visited = new Set();
    while (node) {
      if (visited.has(node.TagId)) throw new Error(`Tag inheritance cycle: ${name}`);
      visited.add(node.TagId);
      expanded.add(node.TagName);
      node = nodes[node.ParentId];
    }
  }
  return expanded;
}
export function validateModel(content, scopeIds, expected, qualities) {
  const template = emptyContent();
  assert.deepEqual(
    Object.keys(content).sort(),
    Object.keys(template).sort(),
    "Top-level field whitelist",
  );
  for (const key of Object.keys(template).filter((k) => k !== "miscellaneous"))
    assert.deepEqual(
      Object.keys(content[key]).sort(),
      Object.keys(template[key]).sort(),
      `${key} group whitelist`,
    );
  const all = [],
    counts = {};
  for (const [group, extra] of Object.entries(additionalFields)) {
    const rows = groupAt(content, group);
    assert.ok(Array.isArray(rows), group);
    counts[group] = rows.length;
    if (expected) assert.equal(rows.length, expected[group], `${group} count`);
    for (const row of rows) {
      assert.deepEqual(
        Object.keys(row).sort(),
        [...basicFields, ...extra].sort(),
        `${row.id} field whitelist`,
      );
      assert.ok(Number.isSafeInteger(row.id) && row.id > 0, "Integer ID");
      assert.ok(typeof row.name === "string" && row.name.length > 0, `${row.id} name`);
      for (const [field, value] of Object.entries(row)) {
        if (value === null || field === "id") continue;
        if (field === "quality")
          assert.ok(
            Number.isInteger(value) && (!qualities || qualities.has(value)),
            `${row.id} quality`,
          );
        else if (field === "harvestCount")
          assert.ok(Number.isInteger(value) && value >= 0, `${row.id} harvestCount`);
        else if (field.endsWith("Ids")) {
          assert.ok(Array.isArray(value) && value.every(Number.isSafeInteger), `${row.id} members`);
          assert.equal(new Set(value).size, value.length, `${row.id} duplicate members`);
        } else assert.equal(typeof value, "string", `${row.id}.${field}`);
        if (field === "image") assert.match(value, /^assets\/[a-f0-9]{64}\.png$/);
      }
      all.push(row);
    }
  }
  const ids = all.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "Duplicate IDs across groups");
  assert.deepEqual(new Set(ids), new Set(scopeIds), "Exact root 93 membership");
  for (const [group, [field, target]] of Object.entries(memberTargets)) {
    const targetIds = new Set(groupAt(content, target).map((r) => r.id));
    for (const row of groupAt(content, group))
      for (const id of row[field] ?? [])
        assert.ok(targetIds.has(id), `${row.id}: dangling or wrong-category member ${id}`);
  }
  return { all, counts };
}
