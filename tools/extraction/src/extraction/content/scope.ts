import type { ContentGroup } from "@loomix/content-schema";
import { memberTargets } from "@loomix/content-schema";
import type { Evidence, TableRow } from "../types.ts";
import type { Tables } from "../decode/tables.ts";
import { expandTags } from "./model.ts";
import { profile } from "../../profile.ts";
import type { Vocabulary } from "./vocabulary.ts";

export interface OutsideMember {
  id: number;
  series: number;
  from: Evidence;
  reason: string;
}

export interface Classification {
  rows: TableRow[];
  ids: Set<number>;
  groups: Map<number, ContentGroup>;
  categories: Map<number, string | null>;
}

export interface Scope extends Classification {
  members: Map<number, number[]>;
  outsideMembers: OutsideMember[];
  membersOf(id: number): number[] | null;
}

export function classify(
  tables: Tables,
  vocabulary: Vocabulary,
  main: Map<number | null, TableRow>,
): Classification {
  const rows = tables.rows(profile.roots.content);
  const ids = new Set(rows.map((row) => tables.id(row)));
  if (ids.size !== rows.length) throw new Error("Duplicate root 93 IDs");
  const groups = new Map<number, ContentGroup>();
  const categories = new Map<number, string | null>();
  for (const row of rows) {
    const id = tables.id(row);
    const item = main.get(id);
    if (!item) throw new Error(`No main item ${id}`);
    const itemTags = vocabulary.tags(item, profile.fields.items.category);
    const type = tables.uint(item, profile.fields.items.type);
    let group: ContentGroup;
    let category: string | null = null;
    if (tables.byte(row, profile.fields.content.appearanceFlag, 0) === 1) {
      group = "clothing.appearances";
      const expanded = expandTags(itemTags, vocabulary.tree);
      const matches = ["发型", "眼睛", "眉毛", "面饰", "肤色"].filter((name) => expanded.has(name));
      if (matches.length !== 1) throw new Error(`Unclassified appearance ${id}`);
      category = vocabulary.renderTags(matches) ?? matches[0];
    } else if (type != null && [500, 501].includes(type)) {
      const matches = itemTags.filter((name) => vocabulary.setTags[name]);
      if (matches.length !== 1) throw new Error(`Unclassified set ${id}`);
      group = vocabulary.setTags[matches[0]];
    } else {
      const expanded = expandTags([...itemTags, ...vocabulary.tags(item, 15)], vocabulary.tree);
      const matches = vocabulary.subgroups.filter((subgroup) =>
        subgroup.filters.some((name) => expanded.has(name)),
      );
      if (matches.length !== 1)
        throw new Error(`Category assignment ${id}: ${matches.length} matches`);
      const matched = matches[0];
      group = vocabulary.groupNames[matched.group];
      category = matched.id === 304 ? "采摘材料" : matched.name;
    }
    groups.set(id, group);
    categories.set(id, category);
  }
  return { rows, ids, groups, categories };
}

export function resolveMemberships(tables: Tables, classification: Classification): Scope {
  const memberships = new Map<number, Set<number>>();
  const outsideMembers: OutsideMember[] = [];
  const evidence = (table: number, field: number | number[]): Evidence => ({ table, field });
  const recordMember = (series: number | null, id: number, from: Evidence) => {
    if (!series) return;
    const group = classification.groups.get(series);
    const target = group
      ? (memberTargets as Partial<Record<ContentGroup, readonly [string, ContentGroup]>>)[
          group
        ]?.[1]
      : undefined;
    if (!target) {
      if (classification.groups.has(id))
        outsideMembers.push({ id, series, from, reason: "series_outside_scope" });
      return;
    }
    if (!classification.groups.has(id)) {
      outsideMembers.push({ id, series, from, reason: "member_outside_scope" });
      return;
    }
    if (classification.groups.get(id) !== target)
      throw new Error(`Incorrect member category: ${id} -> ${series}`);
    if (!memberships.has(series)) memberships.set(series, new Set());
    memberships.get(series)!.add(id);
  };

  const uiSeriesField = profile.fields.ui.series;
  for (const row of tables.rows(profile.roots.ui)) {
    const series = tables.uint(row, uiSeriesField);
    if (series) recordMember(series, tables.id(row), evidence(profile.roots.ui, uiSeriesField));
  }
  for (const [table, field, targetGroup] of [
    [profile.roots.furniture, 9, "furniture.items"],
    [profile.roots.clothing, 9, "clothing.items"],
  ] as const) {
    for (const row of tables.rows(table)) {
      const id = tables.id(row);
      const series = tables.uint(row, field);
      if (
        series &&
        (!classification.groups.has(id) || classification.groups.get(id) === targetGroup)
      )
        recordMember(series, id, evidence(table, field));
    }
  }

  const members = new Map<number, number[]>();
  for (const [series, ids] of memberships)
    members.set(
      series,
      [...ids].sort((a, b) => a - b),
    );
  return {
    ...classification,
    members,
    outsideMembers,
    membersOf: (id) => members.get(id) ?? null,
  };
}
