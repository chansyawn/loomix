import type { RecordType } from "@loomix/schema/extraction";
import type { FrozenAdmissions, RecordEvidence } from "./admissions.ts";
import type { ManualEvidence } from "../types.ts";
import { plainText } from "./model.ts";
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
  encyclopedia: Map<number, TableRow>;
  admissionEvidence: RecordEvidence[];
  manual: Map<number, ManualEvidence>;
  ids: Set<number>;
  groups: Map<number, RecordType>;
  categories: Map<number, string | null>;
}

export interface Scope extends Classification {
  members: Map<number, number[]>;
  outsideMembers: OutsideMember[];
  membersOf(id: number): number[] | null;
}

export function classify(
  tables: Pick<Tables, "rows" | "id" | "uint" | "byte" | "text">,
  vocabulary: Pick<
    Vocabulary,
    "tags" | "tree" | "renderTags" | "setTags" | "subgroups" | "groupNames"
  >,
  main: Map<number | null, TableRow>,
  admissions: FrozenAdmissions,
): Classification {
  const rows = tables.rows(profile.roots.content);
  const ids = new Set(rows.map((row) => tables.id(row)));
  if (ids.size !== rows.length) throw new Error("Duplicate root 93 IDs");
  const groups = new Map<number, RecordType>();
  const categories = new Map<number, string | null>();
  for (const row of rows) {
    const id = tables.id(row);
    const item = main.get(id);
    if (!item) throw new Error(`No main item ${id}`);
    const itemTags = vocabulary.tags(item, profile.fields.items.category);
    const type = tables.uint(item, profile.fields.items.type);
    let group: RecordType;
    let category: string | null = null;
    if (tables.byte(row, profile.fields.content.appearanceFlag, 0) === 1) {
      group = "clothing.appearance";
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
      category =
        group === "miscellaneous.item" || group === "dishes.item"
          ? null
          : matched.id === 304
            ? "采摘材料"
            : matched.name;
    }
    groups.set(id, group);
    categories.set(id, category);
  }
  const encyclopedia = new Map(rows.map((row) => [tables.id(row), row]));
  const admissionEvidence: RecordEvidence[] = rows.map((row) => ({
    id: tables.id(row),
    admissionSources: [
      { kind: "encyclopedia", file: "prepared/ed.obb", table: 93, rowOffset: row.rowOffset },
    ],
    encyclopedia: {
      state: "present",
      file: "prepared/ed.obb",
      table: 93,
      rowOffset: row.rowOffset,
      listed: tables.byte(row, 1, 0) === 0,
    },
  }));
  const manual = new Map<number, ManualEvidence>();
  for (const [index, entry] of admissions.data.entries.entries()) {
    const item = main.get(entry.id);
    if (!item) throw new Error(`No main item ${entry.id}`);
    if (plainText(tables.text(item, profile.fields.items.name)) !== entry.expectedName)
      throw new Error(`Supplemental name mismatch ${entry.id}`);
    const group = `${entry.category}.item` as RecordType;
    if (
      ids.has(entry.id) &&
      (groups.get(entry.id) !== group || categories.get(entry.id) !== entry.subcategory)
    )
      throw new Error(`Supplemental classification conflict ${entry.id}`);
    const source = {
      kind: "manual" as const,
      file: admissions.file,
      pointer: `/entries/${index}`,
      sha256: admissions.sha256,
    };
    manual.set(entry.id, source);
    const existing = admissionEvidence.find((record) => record.id === entry.id);
    if (existing) existing.admissionSources.push(source);
    else
      admissionEvidence.push({
        id: entry.id,
        admissionSources: [source],
        encyclopedia: { state: "absent", file: "prepared/ed.obb", table: 93 },
      });
    ids.add(entry.id);
    groups.set(entry.id, group);
    categories.set(entry.id, entry.subcategory);
  }
  admissionEvidence.sort((a, b) => a.id - b.id);
  return { rows, ids, groups, categories, encyclopedia, admissionEvidence, manual };
}

export function resolveMemberships(tables: Tables, classification: Classification): Scope {
  const memberships = new Map<number, Set<number>>();
  const outsideMembers: OutsideMember[] = [];
  const evidence = (table: number, field: number | number[]): Evidence => ({ table, field });
  const recordMember = (series: number | null, id: number, from: Evidence) => {
    if (!series) return;
    const group = classification.groups.get(series);
    const target =
      group && (group.endsWith(".series") || group.endsWith(".set"))
        ? `${group.split(".")[0]}.item`
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
    [profile.roots.furniture, 9, "furniture.item"],
    [profile.roots.clothing, 9, "clothing.item"],
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
