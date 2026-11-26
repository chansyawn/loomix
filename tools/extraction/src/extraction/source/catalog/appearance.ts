import assert from "node:assert/strict";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { profile } from "../../../profile.ts";
import type { TableFieldSource } from "../../evidence/domain-schema.ts";
import type { TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";
import type {
  AppearanceInvestigation,
  AppearanceSource,
  EncyclopediaEvidence,
} from "./admissions.ts";
import { expandTags } from "./model.ts";
import type { Vocabulary } from "./vocabulary.ts";

const tags = ["发型", "眼睛", "眉毛", "肤色", "面饰"] as const;
type AppearanceTag = (typeof tags)[number];
type AppearanceTables = Pick<Tables, "rows" | "id" | "uint" | "byte">;

export interface AppearanceAdmission {
  tag: AppearanceTag;
  category: string;
  sources: AppearanceSource[];
}

const cite = (row: TableRow, ...fields: number[]): TableFieldSource => ({
  kind: "table",
  file: "prepared/ed.obb",
  table: row.root,
  rowOffset: row.rowOffset,
  fields,
});

export function encyclopediaEvidence(
  tables: Pick<Tables, "byte">,
  row: TableRow | undefined,
): EncyclopediaEvidence {
  const locator = { file: "prepared/ed.obb", table: 93 } as const;
  return row
    ? {
        ...locator,
        state: "present",
        rowOffset: row.rowOffset,
        listed: tables.byte(row, 1, 0) === 0,
      }
    : { ...locator, state: "absent" };
}

export function readAppearanceAdmissions(
  tables: AppearanceTables,
  main: ReadonlyMap<number | null, TableRow>,
  encyclopedia: ReadonlyMap<number, TableRow>,
  vocabulary: Pick<Vocabulary, "tags" | "renderTags"> & { tagIndex: GameplayTagIndex },
) {
  const {
    tables: roots,
    fields,
    shopGroups,
    unconfirmedShopGroup,
    poolIds,
    faceGift,
  } = profile.appearance;
  const candidates = new Map<number, AppearanceAdmission>();
  for (const [id, row] of main) {
    if (id === null) continue;
    const marked =
      tables.byte(encyclopedia.get(id), profile.fields.content.appearanceFlag, 0) === 1;
    const ancestors = expandTags(
      vocabulary.tags(row, profile.fields.items.tagType),
      vocabulary.tagIndex,
    );
    const matches = tags.filter((tag) => ancestors.has(tag) && (tag !== "面饰" || marked));
    if (marked || matches.length) assert.equal(matches.length, 1, `Unclassified appearance ${id}`);
    const tag = matches[0];
    if (tag)
      candidates.set(id, { tag, category: vocabulary.renderTags([tag]) ?? tag, sources: [] });
  }

  const cards = new Map<number, TableRow>();
  for (const row of tables.rows(roots.cards)) {
    const cardId = tables.id(row);
    assert.ok(!cards.has(cardId), `Duplicate appearance card ${cardId}`);
    cards.set(cardId, row);
    const itemId = tables.uint(row, fields.cardItem);
    if (itemId === null || tables.uint(row, fields.initial, 0) !== 1) continue;
    const appearance = candidates.get(itemId);
    appearance?.sources.push({
      kind: "initial",
      rows: [cite(row, 0, fields.cardItem, fields.initial)],
    });
  }

  const uncertain = new Map<number, TableFieldSource[]>();
  for (const row of tables.rows(roots.goods)) {
    const group = tables.uint(row, fields.goodsGroup);
    const confirmedTag = shopGroups.find(({ id }) => id === group)?.tag;
    if (!confirmedTag && group !== unconfirmedShopGroup) continue;
    const cardId = tables.uint(row, fields.goodsCard);
    const card = cardId === null ? undefined : cards.get(cardId);
    const itemId = tables.uint(card, fields.cardItem);
    const appearance = itemId === null ? undefined : candidates.get(itemId);
    if (group === unconfirmedShopGroup && !(appearance && card && itemId !== null)) continue;
    assert.ok(appearance && card && itemId !== null, `Missing shop appearance ${tables.id(row)}`);
    const rows = [
      cite(row, 0, fields.goodsGroup, fields.goodsCard),
      cite(card, 0, fields.cardItem),
    ];
    if (group === unconfirmedShopGroup) {
      uncertain.set(itemId, [...(uncertain.get(itemId) ?? []), ...rows]);
      continue;
    }
    assert.equal(appearance.tag, confirmedTag, `Shop appearance category ${itemId}`);
    appearance.sources.push({ kind: "televisionShop", rows });
  }

  const rewards = tables.rows(roots.rewards);
  for (const pool of tables.rows(roots.pools)) {
    if (!poolIds.includes(tables.id(pool))) continue;
    const group = tables.uint(pool, fields.rewardGroup);
    assert.ok(group, `Missing reward group ${tables.id(pool)}`);
    for (const reward of rewards.filter((row) => tables.id(row) === group)) {
      const cardId = tables.uint(reward, fields.rewardCard);
      const card = cardId === null ? undefined : cards.get(cardId);
      if (!card) continue;
      const itemId = tables.uint(card, fields.cardItem);
      const appearance = itemId === null ? undefined : candidates.get(itemId);
      if (!appearance) continue;
      assert.equal(tables.uint(reward, fields.rewardItem), itemId, `Reward appearance ${cardId}`);
      appearance.sources.push({
        kind: "gacha",
        rows: [
          cite(pool, 0, fields.rewardGroup),
          cite(reward, 0, fields.rewardCard, fields.rewardItem),
          cite(card, 0, fields.cardItem),
        ],
      });
    }
  }

  const face = candidates.get(faceGift.itemId);
  if (face) {
    const gift = tables.rows(roots.gifts).find((row) => tables.id(row) === faceGift.giftId);
    const contents = tables
      .rows(roots.giftItems)
      .filter(
        (row) =>
          tables.id(row) === faceGift.giftId &&
          tables.uint(row, fields.giftItem) === faceGift.itemId,
      );
    assert.equal(face.tag, "面饰");
    assert.ok(gift && contents.length, `Missing confirmed face gift ${faceGift.giftId}`);
    face.sources.push({
      kind: "gift",
      rows: [cite(gift, 0), ...contents.map((row) => cite(row, 0, fields.giftItem))],
    });
  }

  const admitted = new Map<number, AppearanceAdmission>();
  const investigation: AppearanceInvestigation[] = [];
  for (const [id, appearance] of [...candidates].sort(([left], [right]) => left - right)) {
    if (appearance.sources.length) admitted.set(id, appearance);
    else
      investigation.push({
        id,
        tag: appearance.tag,
        reason: uncertain.has(id) ? "unconfirmed_shop_group" : "no_confirmed_acquisition",
        encyclopedia: encyclopediaEvidence(tables, encyclopedia.get(id)),
        rows: uncertain.get(id) ?? [],
      });
  }
  return { admitted, investigation };
}
