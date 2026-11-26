import type { RecordType } from "../../schema.ts";
import type { FrozenAdmissions, RecordEvidence } from "./admissions.ts";
import type { ManualEvidence } from "../../types.ts";
import { plainText } from "./model.ts";
import type { Evidence, TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import { expandTags } from "./model.ts";
import { profile } from "../../../profile.ts";
import type { Vocabulary } from "./vocabulary.ts";
import { encyclopediaEvidence } from "./appearance.ts";
import type { readAppearanceAdmissions } from "./appearance.ts";

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
  appearances: ReturnType<typeof readAppearanceAdmissions>;
  manual: Map<number, ManualEvidence>;
  ids: Set<number>;
  groups: Map<number, RecordType>;
  categories: Map<number, string | null>;
}

export interface Scope extends Classification {
  members: Map<number, number[]>;
  membershipSources: Map<number, import("../../types.ts").TableEvidence[]>;
  outsideMembers: OutsideMember[];
  membersOf(id: number): number[] | null;
}

export function classify(
  tables: Pick<Tables, "rows" | "id" | "uint" | "byte" | "text">,
  vocabulary: Pick<
    Vocabulary,
    "tags" | "tagIndex" | "renderTags" | "setTags" | "subgroups" | "groupNames"
  >,
  main: Map<number | null, TableRow>,
  admissions: FrozenAdmissions,
  encyclopedia: Map<number, TableRow>,
  appearances: ReturnType<typeof readAppearanceAdmissions>,
): Classification {
  const rows = [...encyclopedia.values()];
  const ids = new Set<number>();
  const groups = new Map<number, RecordType>();
  const categories = new Map<number, string | null>();
  for (const row of rows) {
    const id = tables.id(row);
    const item = main.get(id);
    if (!item) throw new Error(`No main item ${id}`);
    if (
      tables.byte(row, profile.fields.content.appearanceFlag, 0) === 1 ||
      appearances.admitted.has(id)
    )
      continue;
    ids.add(id);
    const itemTags = vocabulary.tags(item, profile.fields.items.tagType);
    const type = tables.uint(item, profile.fields.items.type);
    let group: RecordType;
    let category: string | null = null;
    if (type != null && [500, 501].includes(type)) {
      const matches = itemTags.filter((name) => vocabulary.setTags[name]);
      if (matches.length !== 1) throw new Error(`Unclassified set ${id}`);
      group = vocabulary.setTags[matches[0]];
    } else {
      const expanded = expandTags([...itemTags, ...vocabulary.tags(item, 15)], vocabulary.tagIndex);
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
  const admissionEvidence: RecordEvidence[] = [...ids].map((id) => ({
    id,
    admissionSources: [
      {
        kind: "encyclopedia",
        file: "prepared/ed.obb",
        table: 93,
        rowOffset: encyclopedia.get(id)!.rowOffset,
      },
    ],
    encyclopedia: encyclopediaEvidence(tables, encyclopedia.get(id)),
  }));
  for (const [id, appearance] of appearances.admitted) {
    ids.add(id);
    groups.set(id, "clothing.appearance");
    categories.set(id, appearance.category);
    admissionEvidence.push({
      id,
      admissionSources: [...appearance.sources],
      encyclopedia: encyclopediaEvidence(tables, encyclopedia.get(id)),
    });
  }
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
        encyclopedia: encyclopediaEvidence(tables, encyclopedia.get(entry.id)),
      });
    ids.add(entry.id);
    groups.set(entry.id, group);
    categories.set(entry.id, entry.subcategory);
  }
  admissionEvidence.sort((a, b) => a.id - b.id);
  return { rows, ids, groups, categories, encyclopedia, admissionEvidence, manual, appearances };
}

export function resolveMemberships(tables: Tables, classification: Classification): Scope {
  const memberships = new Map<number, Set<number>>();
  const membershipSources = new Map<number, import("../../types.ts").TableEvidence[]>();
  const outsideMembers: OutsideMember[] = [];
  const evidence = (
    table: number,
    field: number | number[],
  ): import("../../types.ts").TableEvidence => ({ table, field });
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
    if (!Array.isArray(from) && "table" in from)
      membershipSources.set(series, [...(membershipSources.get(series) ?? []), from]);
  };

  const uiSeriesField = profile.fields.ui.series;
  for (const row of tables.rows(profile.roots.ui)) {
    const series = tables.uint(row, uiSeriesField);
    if (series)
      recordMember(series, tables.id(row), {
        ...evidence(profile.roots.ui, uiSeriesField),
        sources: [
          {
            file: "prepared/ed.obb",
            table: row.root,
            rowOffset: row.rowOffset,
            fields: [0, uiSeriesField],
          },
        ],
      });
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
        recordMember(series, id, {
          table,
          field,
          sources: [
            { file: "prepared/ed.obb", table, rowOffset: row.rowOffset, fields: [0, field] },
          ],
        });
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
    membershipSources,
    outsideMembers,
    membersOf: (id) => members.get(id) ?? null,
  };
}
