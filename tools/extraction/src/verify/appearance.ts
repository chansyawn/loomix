import assert from "node:assert/strict";
import type {
  FieldEvidence,
  EvidenceSource,
  TableFieldSource,
} from "../extraction/evidence/domain-schema.ts";
import type { ClientReadRecords } from "../extraction/model.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type {
  AppearanceInvestigation,
  AppearanceSource,
  RecordEvidence,
} from "../extraction/source/catalog/admissions.ts";
import type { TableRow } from "../extraction/types.ts";
import { verifyFieldSources } from "./evidence.ts";

const appearanceTags = ["发型", "眼睛", "眉毛", "肤色", "面饰"] as const;
const cite = (row: TableRow, fields: number[]): TableFieldSource => ({
  kind: "table",
  file: "prepared/ed.obb",
  table: row.root,
  rowOffset: row.rowOffset,
  fields,
});

export function verifyAppearanceAdmissions(
  tables: Tables,
  observations: ClientReadRecords["diagnostics"],
  evidence: readonly FieldEvidence[],
  resolveTags: (item: TableRow) => ReadonlySet<string>,
  categorySources: (tag: string) => EvidenceSource[],
) {
  const content = tables.byId(93);
  const cards = tables.rows(113);
  const goods = tables.rows(659);
  const pools = tables.rows(267).filter((row) => [300001, 300002, 300004].includes(tables.id(row)));
  const rewards = tables.rows(269);
  const presentGift = tables.rows(153).find((row) => tables.id(row) === 160007);
  const giftContents = tables
    .rows(154)
    .filter((row) => tables.id(row) === 160007 && tables.uint(row, 1) === 60673);
  const admissions = new Map<number, (typeof appearanceTags)[number]>();
  const investigations: AppearanceInvestigation[] = [];
  for (const item of [...tables.rows(318)].sort(
    (left, right) => tables.id(left) - tables.id(right),
  )) {
    const id = tables.id(item);
    const encyclopediaRow = content.get(id);
    const marked = tables.byte(encyclopediaRow, 1, 0) === 1;
    const tags = resolveTags(item);
    const matching = appearanceTags.filter((tag) => tags.has(tag) && (tag !== "面饰" || marked));
    if (!marked && !matching.length) continue;
    assert.equal(matching.length, 1, `Independent appearance tag ${id}`);
    const tag = matching[0]!;
    const encyclopedia: RecordEvidence["encyclopedia"] = encyclopediaRow
      ? {
          state: "present",
          file: "prepared/ed.obb",
          table: 93,
          rowOffset: encyclopediaRow.rowOffset,
          listed: !marked && tables.byte(encyclopediaRow, 1, 0) === 0,
        }
      : { state: "absent", file: "prepared/ed.obb", table: 93 };
    const itemCards = new Map(
      cards.filter((row) => tables.uint(row, 3) === id).map((row) => [tables.id(row), row]),
    );
    const sources: AppearanceSource[] = [...itemCards.values()]
      .filter((row) => tables.uint(row, 4) === 1)
      .map((row) => ({ kind: "initial", rows: [cite(row, [0, 3, 4])] }));
    const unconfirmed: TableFieldSource[] = [];
    for (const row of goods) {
      const card = itemCards.get(tables.uint(row, 2, 0));
      if (!card) continue;
      const group = tables.uint(row, 1);
      if (group === 82) unconfirmed.push(cite(row, [0, 1, 2]), cite(card, [0, 3]));
      if ((group === 10 && tag === "发型") || (group === 11 && tag === "眼睛"))
        sources.push({ kind: "televisionShop", rows: [cite(row, [0, 1, 2]), cite(card, [0, 3])] });
    }
    for (const pool of pools)
      for (const reward of rewards) {
        if (tables.id(reward) !== tables.uint(pool, 7) || tables.uint(reward, 13) !== id) continue;
        const card = itemCards.get(tables.uint(reward, 4, 0));
        if (card)
          sources.push({
            kind: "gacha",
            rows: [cite(pool, [0, 7]), cite(reward, [0, 4, 13]), cite(card, [0, 3])],
          });
      }
    if (id === 60673 && tag === "面饰" && presentGift && giftContents.length)
      sources.push({
        kind: "gift",
        rows: [cite(presentGift, [0]), ...giftContents.map((row) => cite(row, [0, 1]))],
      });

    const admission = observations.admissions.find((entry) => entry.id === id);
    if (!sources.length) {
      if (marked) assert.equal(admission, undefined, `Excluded appearance admitted ${id}`);
      investigations.push({
        id,
        tag,
        encyclopedia,
        rows: unconfirmed,
        reason: unconfirmed.length ? "unconfirmed_shop_group" : "no_confirmed_acquisition",
      });
      continue;
    }
    admissions.set(id, tag);
    assert.deepEqual(
      admission,
      { id, admissionSources: sources, encyclopedia },
      `Independent appearance admission ${id}`,
    );
    const observed = observations.collection.items.find((entry) => entry.id === id);
    assert.deepEqual(
      observed?.encyclopediaEntry,
      encyclopedia.state === "present" ? { listed: encyclopedia.listed } : null,
      `Independent appearance encyclopedia state ${id}`,
    );
    verifyFieldSources(
      evidence,
      "catalog.items",
      id,
      "kind",
      sources.flatMap(({ rows }) => rows),
    );
    verifyFieldSources(evidence, "catalog.items", id, "category", [
      cite(item, [6]),
      ...categorySources(tag),
    ]);
  }
  assert.deepEqual(
    observations.investigation.appearances,
    investigations,
    "Independent appearance investigation",
  );
  return admissions;
}
