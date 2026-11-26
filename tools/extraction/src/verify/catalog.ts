import assert from "node:assert/strict";
import path from "node:path";
import type { Dataset } from "@loomix/schema/dataset";
import type { ClientReadRecords } from "../extraction/model.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { hashTextKey } from "../extraction/source/decode/tables.ts";
import type { EvidenceSource, FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import type { BinDataAsset } from "../extraction/types.ts";
import { parseTagBinData } from "../extraction/source/decode/bindata.ts";
import { readJson } from "../workflow/json.ts";
import type { SupplementalAdmissions } from "../extraction/source/catalog/admissions.ts";
import { verifyAppearanceAdmissions } from "./appearance.ts";

const text = (value: string | null) =>
  value
    ?.replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .trim() || null;
const tokens = (value: string | null) =>
  value
    ? value
        .split(/[,;，]/)
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
const sorted = (values: Iterable<number>) => [...values].sort((a, b) => a - b);

export function verifyCatalogSources(
  dataset: Dataset,
  observations: ClientReadRecords,
  tables: Tables,
  source: string,
  fieldEvidence: readonly FieldEvidence[] = [],
): ReadonlySet<number> {
  const manifest = readJson<BinDataAsset[]>(path.join(source, "bindata-manifest.json"));
  const raw = (name: string) => {
    const entry = manifest.find((entry) => entry.Name === name);
    assert.ok(entry, `Frozen BinData ${name}`);
    return readJson(path.join(source, entry.file));
  };
  // 此处仅复用字节结构解码，标签合并、祖先遍历与目录规则独立计算。
  const tagAsset = manifest.find((entry) => entry.Name === "633e15d6");
  const displayAsset = manifest.find((entry) => entry.Name === "b429c67e");
  assert.ok(tagAsset && displayAsset, "Frozen gameplay tag inputs");
  const { tree, tagDisplay } = parseTagBinData(raw(tagAsset.Name), raw(displayAsset.Name));
  const tags = Object.values(tree).sort((a, b) => a.TagId - b.TagId);
  assert.deepEqual(
    dataset.gameplayTags.tags,
    tags.map((tag) => ({
      id: tag.TagId,
      internalName: tag.TagName,
      parentId: tag.ParentId === 4294967295 ? null : tag.ParentId,
      displayName: tables.key(tagDisplay[tag.TagId]?.nameInGame?.textId),
    })),
    "Independent gameplay tag definitions",
  );
  const byName = new Map(tags.map((tag) => [tag.TagName, tag]));
  const ancestors = (names: string[]): Set<string> => {
    const result = new Set<string>();
    for (const name of names) {
      let current = byName.get(name);
      const seen = new Set<number>();
      assert.ok(current, `Unknown source tag ${name}`);
      while (current) {
        assert.ok(!seen.has(current.TagId), "Tag ancestry cycle");
        seen.add(current.TagId);
        result.add(current.TagName);
        current = tree[current.ParentId];
      }
    }
    return result;
  };
  const main = tables.byId(318),
    ui = new Map(tables.rows(325).map((row) => [tables.id(row), row]));
  const manual = readJson<SupplementalAdmissions>(
    path.join(source, "supplemental-admissions.json"),
  );
  const appearance = verifyAppearanceAdmissions(
    tables,
    observations.diagnostics,
    fieldEvidence,
    (row) => ancestors(tokens(tables.string(row, 6)).filter((tag) => byName.has(tag))),
    (tag) => {
      const sources: EvidenceSource[] = [tagAsset, displayAsset].map((entry) => ({
        kind: "asset",
        file: entry.Source,
        pathId: String(entry.PathID),
      }));
      const key = tagDisplay[byName.get(tag)!.TagId]?.nameInGame?.textId;
      const label = key ? tables.textmap[hashTextKey(key)] : undefined;
      if (label?.nameZh)
        sources.push({
          kind: "table",
          file: "prepared/ed.obb",
          table: 1,
          rowOffset: label.rowOffset,
          fields: [1],
        });
      return sources;
    },
  );
  const expectedBase = new Set([
    ...tables
      .rows(93)
      .filter((row) => tables.byte(row, 1, 0) !== 1)
      .map((row) => tables.id(row)),
    ...manual.entries.map((entry) => entry.id),
    ...appearance.keys(),
  ]);
  assert.deepEqual(
    sorted(observations.diagnostics.collection.items.map((entry) => entry.id)),
    sorted(expectedBase),
    "Independent encyclopedia/manual admission",
  );
  const memberKinds: Record<string, string> = {
    furniture: "furniture",
    clothing: "clothing",
    creatures: "creature",
    plants: "plant",
    dishes: "dish",
    miscellaneous: "material",
  };
  const groups: Record<number, string> = {
    1: "creature",
    2: "plant",
    3: "dish",
    4: "furniture",
    5: "clothing",
    6: "material",
  };
  const collectionKinds: Record<string, string> = {
    家具套组: "furniture",
    服装套组: "clothing",
    鱼套组: "creature",
    昆虫套组: "creature",
    赶海生物套组: "creature",
    作物套组: "plant",
    花套组: "plant",
    烹饪套组: "dish",
  };
  for (const id of expectedBase) {
    const item = dataset.catalog.items.find((entry) => entry.id === id);
    const collection = dataset.catalog.collections.find((entry) => entry.id === id);
    const record = item ?? collection;
    assert.ok(
      record && !("kind" in record && record.kind === "reference"),
      `Missing listed entry ${id}`,
    );
    const row = main.get(id);
    assert.ok(row);
    assert.equal(record.name, text(tables.text(row, 1)), `Independent name ${id}`);
    assert.ok("quality" in record);
    assert.equal(
      record.quality,
      ui.has(id) ? tables.uint(ui.get(id), 15, 0) : null,
      `Independent quality ${id}`,
    );
    const override = manual.entries.find((entry) => entry.id === id);
    const encyclopedia = tables.rows(93).find((row) => tables.id(row) === id);
    let kind: string;
    let category: string | null = null;
    const appearanceTag = appearance.get(id);
    if (appearanceTag) {
      kind = "appearance";
      const tag = byName.get(appearanceTag)!;
      category = tables.key(tagDisplay[tag.TagId]?.nameInGame?.textId) ?? appearanceTag;
    } else if (override && !encyclopedia) {
      kind = memberKinds[override.category]!;
      category = override.subcategory;
    } else if ([500, 501].includes(tables.uint(row, 2, 0))) {
      const categories = tokens(tables.string(row, 6)).flatMap((name) =>
        collectionKinds[name] ? [collectionKinds[name]!] : [],
      );
      assert.equal(categories.length, 1);
      kind = categories[0]!;
      assert.ok(collection);
      assert.equal(collection.memberKind, kind, `Independent collection classification ${id}`);
      const table = kind === "furniture" ? 262 : kind === "clothing" ? 519 : 325;
      const field = table === 325 ? 35 : 9;
      const members = new Set<number>();
      for (const sourceTable of new Set([325, table]))
        for (const row of tables.rows(sourceTable))
          if (
            tables.uint(row, sourceTable === 325 ? 35 : field) === id &&
            expectedBase.has(tables.id(row)) &&
            dataset.catalog.items.some((item) => item.id === tables.id(row) && item.kind === kind)
          )
            members.add(tables.id(row));
      assert.deepEqual(
        collection.memberIds,
        members.size ? sorted(members) : null,
        `Independent member relationships ${id}`,
      );
      continue;
    } else {
      const names = ancestors([
        ...tokens(tables.string(row, 6)),
        ...tokens(tables.string(row, 15)),
      ]);
      const matched = tables
        .rows(33)
        .filter((row) => tokens(tables.string(row, 5)).some((name) => names.has(name)));
      assert.equal(matched.length, 1, `Independent category ${id}`);
      kind = groups[tables.id(matched[0])]!;
      category =
        kind === "material" || kind === "dish"
          ? null
          : tables.uint(matched[0], 3) === 304
            ? "采摘材料"
            : tables.text(matched[0], 4);
    }
    assert.ok(item && item.kind !== "reference");
    assert.equal(item.kind, kind, `Independent item classification ${id}`);
    if ("category" in item)
      assert.equal(item.category, category, `Independent display category ${id}`);
  }
  const allowed = readJson<{ id: number; name: string }[]>(
    path.join(source, "neighbor-allowlist.json"),
  );
  const allowedIds = new Set(allowed.map((entry) => entry.id));
  assert.deepEqual(
    dataset.neighbors.neighbors.map((entry) => ({ id: entry.id, name: entry.name })),
    allowed,
    "Independent frozen neighbor admission",
  );
  const outfits = tables.rows(474).filter((row) => {
    const npc = tables.uint(row, 1),
      player = tables.uint(row, 11);
    return (
      (npc === null || allowedIds.has(npc)) &&
      (npc !== null || (tables.id(row) >= 1_000_000 && player !== null))
    );
  });
  assert.deepEqual(
    sorted(
      dataset.catalog.items
        .filter((entry) => entry.kind === "neighborOutfit")
        .map((entry) => entry.id),
    ),
    sorted(outfits.map((row) => tables.id(row))),
    "Independent outfit admission",
  );
  const seedIds = observations.diagnostics.collection.seeds.map((entry) => entry.id);
  const craftingProducts = new Set(
    dataset.catalog.items.filter((item) => item.kind === "furniture").map((item) => item.id),
  );
  const cardIds = tables.rows(568).flatMap((row) => {
    const id = tables.id(row);
    return tables.uint(main.get(id), 2) === 19 && craftingProducts.has(tables.uint(row, 1, 0))
      ? [id]
      : [];
  });
  const expectedFormal = new Set([
    ...expectedBase,
    ...seedIds,
    ...cardIds,
    ...outfits.map((row) => tables.id(row)),
  ]);
  const actualFormal = [
    ...dataset.catalog.items.filter((entry) => entry.kind !== "reference"),
    ...dataset.catalog.collections,
  ].map((entry) => entry.id);
  assert.deepEqual(sorted(actualFormal), sorted(expectedFormal), "Exact formal admission union");
  for (const item of dataset.catalog.items) {
    if (item.kind === "reference") continue;
    const row = main.get(item.id);
    assert.ok(row);
    const type = tables.byId(716).get(tables.uint(row, 2, 0));
    assert.ok(type);
    const names = [
      ...[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].flatMap((field) =>
        tokens(tables.string(row, field)),
      ),
      ...tokens(tables.string(type, 10)),
    ];
    const expected = [
      ...new Set(
        names.map((name) => {
          const tag = byName.get(name);
          assert.ok(tag, `Unknown direct tag ${name}`);
          return tag.TagId;
        }),
      ),
    ];
    assert.deepEqual(item.tagIds, expected, `Independent ordered tag union ${item.id}`);
  }
  for (const item of dataset.catalog.items) {
    if (item.kind === "plant") {
      const treeRow = tables.rows(708).find((row) => tables.id(row) === item.id);
      const fruit = tables.uint(treeRow, 1),
        group = tables.uint(treeRow, 5);
      const expected = [
        ...(fruit === null ? [] : [{ itemId: fruit, source: "fruit" }]),
        ...tables
          .rows(563)
          .filter((row) => group !== null && tables.id(row) === group)
          .map((row) => ({ itemId: tables.uint(row, 2), source: "felling" })),
      ];
      assert.deepEqual(
        item.drops,
        expected.length ? expected : null,
        `Independent published plant drops ${item.id}`,
      );
    }
    if (item.kind === "dish" && item.cooking) {
      const row = tables.rows(122).find((row) => tables.uint(row, 4) === item.id);
      assert.ok(row);
      const rawSlots = [20, 25, 30, 35].flatMap((field) => {
        const raw = tables.string(row, field);
        return raw === null ? [] : [raw];
      });
      const candidates = (name: string): number[] =>
        [...main].flatMap(([id, row]) =>
          id !== null &&
          ancestors(
            [...tokens(tables.string(row, 6)), ...tokens(tables.string(row, 15))].filter((tag) =>
              byName.has(tag),
            ),
          ).has(name)
            ? [id]
            : [],
        );
      const expectedSlots = rawSlots.map((raw) => {
        const alternatives = raw
          .trim()
          .split("|")
          .map((term) => term.split("&").map((name) => name.trim()));
        const terms = alternatives.map((names) =>
          names.map((name) => {
            const tag = byName.get(name);
            assert.ok(tag);
            return { kind: "tag" as const, tagId: tag.TagId };
          }),
        );
        const expression =
          terms.length === 1
            ? terms[0]!.length === 1
              ? terms[0]![0]!
              : { kind: "all", terms: terms[0] }
            : {
                kind: "any",
                terms: terms.map((terms) =>
                  terms.length === 1 ? terms[0]! : { kind: "all", terms },
                ),
              };
        const ids = new Set(
          alternatives.flatMap((names) => {
            const [first, ...rest] = names.map(candidates);
            return first!.filter((id) => rest.every((values) => values.includes(id)));
          }),
        );
        return { expression, itemIds: sorted(ids) };
      });
      assert.deepEqual(
        item.cooking.slots,
        expectedSlots,
        `Independent cooking slot expressions and memberships ${item.id}`,
      );
    }
  }
  for (const neighbor of dataset.neighbors.neighbors)
    for (const [code, level] of [
      [1, "love"],
      [2, "favor"],
      [4, "dislike"],
    ] as const) {
      const rows = tables
        .rows(426)
        .filter((row) => tables.uint(row, 0) === neighbor.id && tables.uint(row, 1) === code);
      const ids = (field: number) =>
        [
          ...new Set(
            rows.flatMap((row) =>
              (tables.string(row, field) ?? "").split(";").filter(Boolean).map(Number),
            ),
          ),
        ].sort((a, b) => a - b);
      assert.deepEqual(
        neighbor.gifts[level],
        { itemIds: ids(3), tagIds: ids(4) },
        `Independent gift relationship ${neighbor.id}:${level}`,
      );
    }
  const formal = new Set(expectedFormal);
  const references = new Set<number>();
  for (const row of tables.rows(111)) {
    for (const field of tables.uint(row, 4) === 2 ? [3, 5] : [3]) {
      const cost = tables.string(row, field)?.trim();
      if (cost) references.add(Number(cost.split("_")[0]));
    }
  }
  for (const islet of dataset.starsea.islets) {
    for (const id of islet.displayedCreatureIds ?? []) references.add(id);
    for (const id of islet.displayedSpecialtyIds ?? []) references.add(id);
  }
  for (const neighbor of dataset.neighbors.neighbors)
    for (const preference of Object.values(neighbor.gifts))
      for (const id of preference.itemIds) references.add(id);
  // 食材引用来自原始食材标签，不能只依赖发布槽位中已经使用的候选。
  const ingredientRoot = byName.get("食材");
  if (ingredientRoot)
    for (const [id, row] of main)
      if (
        id !== null &&
        ancestors(
          [...tokens(tables.string(row, 6)), ...tokens(tables.string(row, 15))].filter((name) =>
            byName.has(name),
          ),
        ).has("食材")
      )
        references.add(id);
  for (const item of dataset.catalog.items) {
    if (item.kind === "inspoCard")
      for (const material of item.recipe.materials ?? []) references.add(material.itemId);
    if (item.kind === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.kind === "neighborOutfit" && item.playerItemId !== null)
      references.add(item.playerItemId);
  }
  assert.deepEqual(
    sorted(
      dataset.catalog.items.filter((entry) => entry.kind === "reference").map((entry) => entry.id),
    ),
    sorted([...references].filter((id) => !formal.has(id))),
    "Exact reference item closure",
  );
  return new Set([...appearance].filter(([, tag]) => tag === "发型").map(([id]) => id));
}
