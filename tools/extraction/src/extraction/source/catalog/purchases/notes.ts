import { isDeepStrictEqual } from "node:util";
import type { PurchaseOffer } from "@loomix/schema/catalog";
import type { EvidenceSource } from "../../../evidence/domain-schema.ts";
import type { TableRow } from "../../../types.ts";
import type { Tables } from "../../decode/tables.ts";
import type { DiscoveryEvidence } from "../../vignettes/inputs.ts";
import { fieldSource, textSource, type Entrance } from "./channels.ts";

interface ReviewedTaskShelf {
  shop: PurchaseOffer["shopId"];
  goods: number[];
  item: number;
  trackers: [number, object][];
  text: [number, string];
}

const finished = (taskId: number) => ({ thresh: 1, finishTaskCount: { taskIds: [taskId] } });

const taskShelves1449213: ReviewedTaskShelf[] = [
  {
    shop: "gelian",
    goods: [309305, 309405, 309505],
    item: 1803,
    trackers: [
      [3549, finished(2038004)],
      [3554, finished(2038009)],
    ],
    text: [2825703257, "找格连购买，花叶拼布沙发椅"],
  },
  {
    shop: "gelian",
    goods: [309924, 310024, 310124],
    item: 1803,
    trackers: [
      [3602, finished(2021078)],
      [3603, { habitatRestored: { habitatId: 3009 } }],
    ],
    text: [3743521915, "绵朵莉与玩偶灵感"],
  },
  {
    shop: "gelian",
    goods: [309306, 309406, 309506],
    item: 1155,
    trackers: [
      [3551, finished(12002052)],
      [3507, finished(12002018)],
    ],
    text: [216535044, "找格连购买，粉白陶瓷杯"],
  },
  {
    shop: "gelian",
    goods: [309309, 309409, 309509],
    item: 1557,
    trackers: [
      [3582, finished(2051012)],
      [3583, finished(2051014)],
    ],
    text: [715774891, "找格连购买，温暖日光灯"],
  },
  {
    shop: "luomiTv",
    goods: [302],
    item: 60515,
    trackers: [
      [3509, { taskStage: { taskId: 4319 } }],
      [3510, { taskStage: { taskId: 4323 } }],
    ],
    text: [2452989747, "在络米电视购中，购买眠月睡袍，并为自己换装"],
  },
];

export interface ShelfOffer {
  offer: PurchaseOffer;
  row: TableRow;
  tier?: TableRow;
  pages: Entrance[];
}

function taskSources(
  { offer, row }: ShelfOffer,
  tables: Tables,
  discovery: Pick<DiscoveryEvidence, "tracker">,
) {
  const shelf = taskShelves1449213.find(
    (entry) =>
      entry.shop === offer.shopId &&
      entry.item === offer.deliveredItemId &&
      entry.goods.includes(tables.id(row)),
  );
  if (!shelf) return;
  const sources: EvidenceSource[] = [fieldSource(row, [17, 18, 23, 24])];
  for (const [index, [key, condition]] of shelf.trackers.entries()) {
    const field = index === 0 ? 17 : 23;
    if (
      tables.string(row, field) !== "SHOP_SALE_CONDITION_TRACKER_GOAL_DONE" ||
      tables.string(row, field + 1) !== `${key},0`
    )
      return;
    const tracker = discovery.tracker(key);
    if (!tracker || !isDeepStrictEqual(tracker.condition, condition)) return;
    sources.push(tracker.source);
  }
  sources.push(textSource(tables, ...shelf.text));
  return sources;
}

function windowSources(pages: Entrance[], pageRows: ReturnType<Tables["byId"]>) {
  const { startsAt, endsAt } = pages[0]!;
  if (!startsAt || !endsAt || startsAt >= endsAt) return;
  const timestamp = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/;
  if (!timestamp.test(startsAt) || !timestamp.test(endsAt)) return;
  if (!pages.every((page) => page.startsAt === startsAt && page.endsAt === endsAt)) return;
  return pages.map(({ pageId }) => fieldSource(pageRows.get(pageId)!, [11, 12]));
}

export function readShelfNotes(
  offers: ShelfOffer[],
  tables: Tables,
  discovery: Pick<DiscoveryEvidence, "tracker">,
  dataRevision: number,
) {
  const notes: { offer: PurchaseOffer; note: string; sources: EvidenceSource[] }[] = [];
  const groups = new Map<string, ShelfOffer[]>();
  for (const entry of offers) {
    const { shopId, deliveredItemId, currencyItemId } = entry.offer;
    const key = `${shopId}:${deliveredItemId}:${currencyItemId}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  const pageRows = tables.byId(665);
  for (const group of groups.values()) {
    if (group.every(({ offer }) => isDeepStrictEqual(offer.price, group[0]!.offer.price))) continue;
    for (const entry of group) {
      const { offer, row, tier, pages } = entry;
      const task = dataRevision === 1449213 ? taskSources(entry, tables, discovery) : undefined;
      const window = windowSources(pages, pageRows);
      if (!task && !window) continue;
      notes.push({
        offer,
        note: "任务/限时货架",
        sources: [
          fieldSource(row, [0, 1, 2, 10, 11]),
          ...(tier ? [fieldSource(tier, [0, 1, 2])] : []),
          ...pages.flatMap((page) => page.sources),
          ...(task ?? []),
          ...(window ?? []),
        ],
      });
    }
  }
  return notes;
}
