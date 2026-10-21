import { parseBinData } from "./bindata.ts";
import { recordSchemas, contentGroups } from "@loomix/content-schema";
import type { ContentGroup } from "@loomix/content-schema";
import type {
  WorkOptions,
  Row,
  TableRow,
  BinDataAsset,
  IndexedAsset,
  FieldValue,
  EvidenceRecord,
  SelectedImage,
} from "./types.ts";
import fs from "node:fs";
import path from "node:path";
import { profile } from "./config.ts";
import { Tables } from "./table-reader.ts";
import { readJson, writeJson, removeWithin } from "./io.ts";
import {
  emptyContent,
  groupAt,
  additionalFields,
  memberTargets,
  splitTags,
  plainText,
  furnitureSize,
  expandTags,
  validateModel,
} from "./model.ts";
import { createIconResolver } from "./icon-resolver.ts";

export function selectImageReferences(group: ContentGroup, tables: Tables, ui: Row) {
  if (group.endsWith(".series")) {
    // 这 67 个主题复用了无关家具的奖励图或占位图。
    // 仅有配置路径不足以证明图片展示的是该系列。
    return [];
  }
  const f = profile.fields.ui;
  return [tables.string(ui, f.largeIcon), tables.string(ui, f.smallIcon)].filter(
    (value): value is string => Boolean(value),
  );
}

export async function structure(options: WorkOptions) {
  const prepared = path.join(options.work, "prepared"),
    tables = new Tables(prepared);
  const root = profile.roots,
    uf = profile.fields.ui;
  const scopeRows = tables.rows(root.content),
    scope = new Set(scopeRows.map((r) => tables.id(r)));
  const main = tables.byId(root.items);
  const uiSignature = (r: TableRow) => ({
    numbers: [0, 8, 9, uf.quality, uf.description, uf.series].map((i) => tables.uint(r, i, 0)),
    sources: tables.vector(r, uf.sources),
    strings: [
      uf.smallIcon,
      uf.largeIcon,
      uf.habitat,
      uf.region,
      uf.times,
      uf.weather,
      uf.seasons,
    ].map((i) => tables.string(r, i)),
  });
  const ui = tables.byId(root.ui, uiSignature, scope),
    creature = tables.byId(root.creatures);
  if (scope.size !== scopeRows.length) throw new Error("Duplicate root 93 IDs");
  const manifests = readJson<BinDataAsset[]>(path.join(options.work, "bindata-manifest.json"));
  const bin = (name: string) =>
    readJson(manifests.find((m) => m.Name === name)?.file ?? "missing-bindata");
  const { tree, tagDisplay, display } = parseBinData(
    bin(profile.binData.tags),
    bin(profile.binData.tagDisplay),
    bin(profile.binData.creatureDisplay),
  );
  const tagByName = new Map(Object.values(tree).map((n) => [n.TagName, n]));
  const tagByEnum = new Map(Object.values(tree).map((n) => [n.EnumName, n]));
  const translateTag = (name: string) => {
    const id = tagByName.get(name)?.TagId;
    return tables.key(id == null ? null : tagDisplay[id]?.nameInGame?.textId) ?? null;
  };
  const tags = (row: Row, field: number) => splitTags(tables.string(row, field));
  const renderTags = (values: string[]) => {
    const translated = values.map(translateTag);
    return values.length && translated.every(Boolean) ? [...new Set(translated)].join("，") : null;
  };
  const renderDisplay = (value: string | null) => {
    const keys = splitTags(value);
    const values = keys.map((key) => {
      const node = tagByEnum.get(key.replace(/^CHabitat_/, ""));
      return (
        tables.key(display[key]?.textContent?.textId ?? key) ??
        tables.key(node ? tagDisplay[node.TagId]?.nameInGame?.textId : null) ??
        (key.startsWith("CHabitat_") && node ? tables.key(`TagDisplayName_${node.EnumName}`) : null)
      );
    });
    return keys.length && values.every(Boolean) ? [...new Set(values)].join("，") : null;
  };
  const qualityRows = tables.rows(root.qualities);
  const qualityLabels = new Map(qualityRows.map((r) => [tables.uint(r, 1, 0), tables.text(r, 2)]));
  if (
    [...qualityLabels].some(([id, label]) => !Number.isInteger(id) || !label) ||
    qualityLabels.size !== 5
  )
    throw new Error("Quality enum changed");
  const subgroups = tables.rows(root.categories).map((r) => ({
    group: tables.id(r),
    id: tables.uint(r, 3),
    name: tables.text(r, 4),
    filters: tags(r, 5),
  }));
  const groupNames: Record<number, ContentGroup> = {
    1: "creatures.items",
    2: "plants.items",
    3: "dishes.items",
    4: "furniture.items",
    5: "clothing.items",
    6: "miscellaneous",
  };
  const setTags: Record<string, ContentGroup> = {
    家具套组: "furniture.sets",
    服装套组: "clothing.sets",
    鱼套组: "creatures.series",
    昆虫套组: "creatures.series",
    赶海生物套组: "creatures.series",
    作物套组: "plants.series",
    花套组: "plants.series",
    烹饪套组: "dishes.series",
  };
  const classified = new Map<number | null, ContentGroup>(),
    categories = new Map<number, string | null>(),
    content = emptyContent();
  const proofs: EvidenceRecord[] = [],
    diagnostics: EvidenceRecord[] = [];
  const outsideMembers: { id: number; series: number; from: unknown; reason: string }[] = [];
  const candidateImages: SelectedImage[] = [];
  const memberGroups: Partial<Record<ContentGroup, readonly [string, ContentGroup]>> =
    memberTargets;
  const put = (
    group: ContentGroup,
    record: Record<string, FieldValue> & { id: number },
    field: string,
    value: FieldValue | undefined,
    evidence: unknown,
    reason = "configuration_missing",
  ) => {
    record[field] = value ?? null;
    const detail = { id: record.id, group, field, value: record[field], evidence };
    if (record[field] === null) diagnostics.push({ ...detail, reason });
    else proofs.push(detail);
  };
  const evidence = (table: number, field: number | number[], note?: string) => ({
    table,
    field,
    ...(note ? { note } : {}),
  });
  for (const row of scopeRows) {
    const id = tables.id(row),
      m = main.get(id);
    if (!m) throw new Error(`No main item ${id}`);
    const itemTags = tags(m, 6),
      type = tables.uint(m, 2);
    let group: ContentGroup;
    let category = null;
    if (tables.byte(row, 1, 0) === 1) {
      group = "clothing.appearances";
      const expanded = expandTags(itemTags, tree);
      const matches = ["发型", "眼睛", "眉毛", "面饰", "肤色"].filter((s) => expanded.has(s));
      if (matches.length !== 1) throw new Error(`Unclassified appearance ${id}`);
      category = renderTags(matches) ?? matches[0];
    } else if (type != null && [500, 501].includes(type)) {
      const matches = itemTags.filter((s) => setTags[s]);
      if (matches.length !== 1) throw new Error(`Unclassified set ${id}`);
      group = setTags[matches[0]];
    } else {
      const expanded = expandTags([...itemTags, ...tags(m, 15)], tree);
      const matches = subgroups.filter((g) => g.filters.some((s) => expanded.has(s)));
      if (matches.length !== 1)
        throw new Error(`Category assignment ${id}: ${matches.length} matches`);
      const matched = matches[0];
      group = groupNames[matched.group];
      category = matched.id === 304 ? "采摘材料" : matched.name;
    }
    classified.set(id, group);
    categories.set(id, category);
  }

  // 仅通过显式且类型明确的反向引用确定系列成员关系。
  const memberships = new Map<number, Set<number>>();
  const recordMember = (series: number | null, id: number, from: unknown) => {
    if (!series) return;
    const group = classified.get(series),
      target = group ? memberGroups[group]?.[1] : undefined;
    if (!target) {
      if (classified.has(id))
        outsideMembers.push({ id, series, from, reason: "series_outside_scope" });
      return;
    }
    if (!classified.has(id)) {
      outsideMembers.push({ id, series, from, reason: "member_outside_scope" });
      return;
    }
    if (classified.get(id) !== target)
      throw new Error(`Incorrect member category: ${id} -> ${series}`);
    if (!memberships.has(series)) memberships.set(series, new Set());
    memberships.get(series)!.add(id);
  };
  for (const r of tables.rows(root.ui)) {
    const id = tables.id(r),
      series = tables.uint(r, uf.series);
    if (series) recordMember(series, id, evidence(root.ui, uf.series));
  }
  for (const [table, field, targetGroup] of [
    [root.furniture, 9, "furniture.items"],
    [root.clothing, 9, "clothing.items"],
  ] as const) {
    for (const r of tables.rows(table)) {
      const id = tables.id(r),
        series = tables.uint(r, field);
      if (series && (!classified.has(id) || classified.get(id) === targetGroup))
        recordMember(series, id, evidence(table, field));
    }
  }

  const cropByProduct = new Map<number, TableRow>();
  for (const r of tables.rows(root.crops))
    for (const id of tables.vector(r, 10) ?? []) {
      if (cropByProduct.has(id)) throw new Error(`Duplicate crop product ${id}`);
      cropByProduct.set(id, r);
    }
  const recipeByProduct = new Map<number | null, TableRow>();
  for (const r of tables.rows(root.recipes)) {
    const id = tables.uint(r, 4);
    if (classified.get(id) !== "dishes.items") continue;
    if (recipeByProduct.has(id)) throw new Error(`Duplicate dish recipe ${id}`);
    recipeByProduct.set(id, r);
  }
  const difficulties = tables.byId(root.recipeDifficulty),
    sources = tables.byId(root.sources);
  const furnitureTypes = tables.rows(root.furnitureTypes);
  const cookwareRows = tables.rows(root.cookware);
  const scales = tables.byId(root.creatureScale);
  const resolveIcon = createIconResolver(
    readJson<IndexedAsset[]>(path.join(prepared, "textures.json")),
    readJson<IndexedAsset[]>(path.join(prepared, "sprites.json")),
  );
  const candidateFields = [];
  for (const row of scopeRows) {
    const id = tables.id(row),
      group = classified.get(id)!,
      m = main.get(id),
      u = ui.get(id);
    const record: Record<string, FieldValue> & { id: number } = {
      name: null,
      image: null,
      description: null,
      id,
      quality: null,
    };
    for (const field of additionalFields[group]) record[field] = null;
    put(
      group,
      record,
      "name",
      plainText(tables.text(m, 1)),
      evidence(root.items, 1),
      "name_textmap_missing",
    );
    if (!record.name) throw new Error(`Unresolved item name ${id}`);
    // 根字段 93 的生物介绍已本地化，优先于物品的简短说明。
    const description =
      tables.text(row, 4) ?? tables.string(creature.get(id), 6) ?? tables.text(u, uf.description);
    put(
      group,
      record,
      "description",
      plainText(description),
      [evidence(root.content, 4), evidence(root.creatures, 6), evidence(root.ui, uf.description)],
      "description_not_configured_or_textmap_missing",
    );
    const quality = u ? tables.uint(u, uf.quality, 0) : null;
    if (quality !== null && !qualityLabels.has(quality))
      throw new Error(`Unknown quality ${quality}`);
    put(
      group,
      record,
      "quality",
      quality,
      [
        evidence(root.ui, uf.quality),
        evidence(root.qualities, 1, "0–4, omitted scalar defaults to 0"),
      ],
      "no_ui_record",
    );
    const references = selectImageReferences(group, tables, u);
    const resolved = references.map(resolveIcon);
    const chosen = resolved.find((a) => a?.matched) ?? null;
    if (chosen) {
      if (!chosen.resourceName || !chosen.source || !chosen.container || !chosen.pathId)
        throw new Error(`Incomplete selected image ${id}`);
      candidateImages.push({
        ...chosen,
        id,
        group,
        resourceName: chosen.resourceName,
        source: chosen.source,
        container: chosen.container,
        pathId: chosen.pathId,
      });
    } else
      diagnostics.push({
        id,
        group,
        field: "image",
        value: null,
        evidence: references,
        reason: group.endsWith(".series")
          ? "series_picture_purpose_unconfirmed"
          : references.length
            ? "configured_resource_missing"
            : "image_not_configured",
      });
    if (memberGroups[group]) {
      const field = memberGroups[group]![0];
      const memberIds = memberships.has(id)
        ? [...memberships.get(id)!].sort((a, b) => a - b)
        : null;
      put(
        group,
        record,
        group === "clothing.sets" ? "setName" : "seriesName",
        record.name,
        evidence(root.items, 1),
      );
      put(
        group,
        record,
        field,
        memberIds,
        group.endsWith(".series")
          ? evidence(root.ui, uf.series)
          : evidence(group === "clothing.sets" ? root.clothing : root.furniture, 9),
        "no_confirmed_membership_backreference",
      );
    } else if (group !== "miscellaneous") {
      if (group !== "dishes.items")
        put(
          group,
          record,
          "category",
          categories.get(id),
          evidence(
            group === "clothing.appearances" ? root.items : root.categories,
            group === "clothing.appearances" ? 6 : 4,
          ),
        );
      if (["furniture.items", "clothing.items"].includes(group)) {
        for (const [field, index] of [
          ["colors", 9],
          ["materials", 11],
          ...(group === "clothing.items" ? [["styles", 12] as const] : []),
        ] as const)
          put(
            group,
            record,
            field,
            renderTags(tags(m, index)),
            evidence(root.items, index, "GameplayTag → TagUIData → TextMap"),
            "tag_missing_or_display_unresolved",
          );
        const sourceIds = tables.vector(u, uf.sources);
        const sourceLabels = sourceIds?.map((code) => tables.text(sources.get(code), 1));
        put(
          group,
          record,
          "sources",
          sourceLabels?.length && sourceLabels.every(Boolean)
            ? [...new Set(sourceLabels)].join("，")
            : null,
          [evidence(root.ui, uf.sources), evidence(root.sources, 1)],
          "source_not_configured_or_textmap_missing",
        );
      }
      if (group === "furniture.items") {
        const direct = new Set(tags(m, 6));
        let matches = furnitureTypes.filter((t) => tags(t, 5).some((tag) => direct.has(tag)));
        if (!matches.length)
          matches = furnitureTypes.filter((t) => tags(t, 3).some((tag) => direct.has(tag)));
        const labels = [
          ...new Set(
            matches
              .map((t) => {
                const prefix = tables.text(t, 2),
                  label = tables.text(t, 4);
                return prefix && label ? `${prefix}·${label}` : null;
              })
              .filter(Boolean),
          ),
        ];
        put(
          group,
          record,
          "type",
          labels.length === 1 ? labels[0] : null,
          evidence(root.furnitureTypes, [2, 4, 5]),
          "type_filter_unmatched_or_ambiguous",
        );
        const sizes = [...new Set(tags(m, 14).map(furnitureSize).filter(Boolean))];
        put(
          group,
          record,
          "size",
          sizes.length === 1 ? sizes[0] : null,
          evidence(root.items, 14),
          "size_tag_missing_or_ambiguous",
        );
      }
      if (group === "creatures.items") {
        for (const [field, index] of [
          ["region", uf.region],
          ["habitat", uf.habitat],
          ["activeSeasons", uf.seasons],
          ["activeTimes", uf.times],
          ["activeWeather", uf.weather],
        ] as const)
          put(
            group,
            record,
            field,
            renderDisplay(tables.string(u, index)),
            evidence(root.ui, index, "display key → localized TextMap"),
            "display_key_missing_or_unresolved",
          );
        const scale = scales.get(id);
        const min = tables.uint(scale, 4),
          max = tables.uint(scale, 5);
        // 显示单位或换算比例确认前，仅将数值范围的端点保留为候选值。
        candidateFields.push({
          id,
          field: "sizeRange",
          table: root.creatureScale,
          fields: [3, 4, 5, 6],
          min,
          max,
          scale: tables.float(scale, 3),
          extraScale: tables.float(scale, 6),
          taskText: tables.text(row, 8),
        });
        put(
          group,
          record,
          "sizeRange",
          null,
          evidence(root.creatureScale, [3, 4, 5, 6]),
          "size_units_and_conversion_unconfirmed",
        );
      }
      if (group === "plants.items") {
        put(
          group,
          record,
          "originGalaxy",
          renderTags(tags(m, 8)),
          evidence(root.items, 8),
          "origin_tag_missing_or_display_unresolved",
        );
        const crop = cropByProduct.get(id);
        put(
          group,
          record,
          "harvestCount",
          crop ? tables.uint(crop, 5) : null,
          evidence(root.crops, [5, 10]),
          "not_in_confirmed_crop_product_vector",
        );
        candidateFields.push({
          id,
          field: "maturityPeriod",
          table: root.crops,
          seedId: crop ? tables.uint(crop, 0) : null,
          mode: tables.string(crop, 3),
          stages: tables.vector(crop, 4),
        });
        put(
          group,
          record,
          "maturityPeriod",
          null,
          evidence(root.crops, [3, 4]),
          "daily_stage_duration_and_first_harvest_rule_unconfirmed",
        );
      }
      if (group === "dishes.items") {
        const recipe = recipeByProduct.get(id),
          difficulty = difficulties.get(tables.uint(recipe, 2));
        put(
          group,
          record,
          "difficulty",
          tables.text(difficulty, 1),
          evidence(root.recipes, [2, 4]),
          "recipe_difficulty_unresolved",
        );
        put(
          group,
          record,
          "galaxyFlavor",
          renderTags(tags(m, 8)),
          evidence(root.items, 8),
          "flavor_tag_missing_or_unresolved",
        );
        const ware = cookwareRows.filter((r) => tables.uint(r, 2) === tables.uint(recipe, 16));
        put(
          group,
          record,
          "cookware",
          ware.length === 1 ? tables.string(ware[0], 1) : null,
          [evidence(root.recipes, [4, 16]), evidence(root.cookware, [1, 2])],
          "cookware_enum_unresolved",
        );
        const strength = tables.uint(u, 8),
          effectTemplate = tables.textmap[4027993099]?.nameZh;
        const hasOtherEffect = tables.uint(u, 9, 0) !== 0;
        put(
          group,
          record,
          "effects",
          strength != null && effectTemplate && !hasOtherEffect
            ? plainText(effectTemplate.replace("%s", String(strength)))
            : null,
          evidence(
            root.ui,
            [8, 9],
            "TextMap 4027993099: 增加 %s 力气; unresolved buffs are not omitted",
          ),
          "effect_missing_or_additional_buff_unresolved",
        );
      }
    }
    groupAt(content, group).push(recordSchemas[group].parse(record));
  }
  for (const group of contentGroups) groupAt(content, group).sort((a, b) => a.id - b.id);
  validateModel(content, scope, profile.expectedContent, new Set(qualityLabels.keys()));
  const staging = path.join(options.work, "staging");
  removeWithin(staging, options.work);
  fs.mkdirSync(path.join(staging, "assets"), { recursive: true });
  writeJson(path.join(staging, "content.json"), content);
  writeJson(
    path.join(options.work, "scope.json"),
    [...scope].sort((a, b) => a - b),
  );
  writeJson(path.join(options.work, "quality-enum.json"), Object.fromEntries(qualityLabels));
  writeJson(path.join(options.work, "selected-images.json"), candidateImages);
  writeJson(path.join(options.work, "field-evidence.json"), proofs);
  writeJson(path.join(options.work, "missing-fields.json"), diagnostics);
  writeJson(path.join(options.work, "outside-members.json"), outsideMembers);
  writeJson(path.join(options.work, "field-candidates.json"), candidateFields);
  writeJson(path.join(options.work, "field-investigation.json"), {
    scope: "All root 93 entries; no availability inference from appearance flag",
    verified: [
      "root 93 membership",
      "33 filters + 318 tags + GameplayTag ancestry",
      "325.15 → 83.1 quality enum (0–4)",
      "325.2 vector → 618.0 source keys",
      "325.35 / 262.9 / 519.9 series backreferences",
      "325.30–34 ecological display keys",
      "144.10 crop product vector → 144.5 harvest count",
      "122.4 dish product → 122.2 difficulty / 122.16 cookware",
    ],
    unresolved: [
      {
        field: "sizeRange",
        candidates: "132.4/5 integers, 132.3/6 float parameters; root93.8 size task text",
        reason:
          "Integer endpoints correlate with task thresholds, but exact displayed unit conversion has no independent schema/UI evidence",
      },
      {
        field: "maturityPeriod",
        candidates: "144.3 daily cycle enum, 144.4 grow-stage IDs; flower/tree configurations",
        reason:
          "Stage count alone does not prove elapsed days or first-harvest time; flower/tree growth rules have not been recovered",
      },
      {
        field: "image",
        groups: "creatures.series / plants.series / dishes.series",
        reason:
          "67 theme display configurations reuse furniture images; dedicated image purpose unconfirmed",
      },
    ],
  });
  console.log(
    `Structured ${scope.size} records; selected ${candidateImages.length} image references`,
  );
}
