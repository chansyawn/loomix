import assert from "node:assert/strict";
import {
  PurchasePriceSchema,
  type PurchaseOffer,
  type PurchasePrice,
  type Shop,
} from "@loomix/schema/catalog";
import type {
  EvidenceSource,
  FieldEvidence,
  TableFieldSource,
} from "../../../evidence/domain-schema.ts";
import type { Tables } from "../../decode/tables.ts";
import type { DiscoveryEvidence } from "../../vignettes/inputs.ts";
import { fieldSource, readEntrances, shopLabels, textSource } from "./channels.ts";
import type { Entrance } from "./channels.ts";
import { readShelfNotes, type ShelfOffer } from "./notes.ts";

export function dailyPrice(raw: string | null): PurchasePrice {
  assert.ok(raw && /^\d+:\d+(?:,\d+:\d+)*$/.test(raw), `Invalid daily price ${raw}`);
  return PurchasePriceSchema.parse({
    kind: "dailyPurchaseCount",
    entries: raw.split(",").map((pair) => {
      const [purchasedToday, amount] = pair.split(":").map(Number);
      return { purchasedToday, amount };
    }),
  });
}

function currencyEvidence(tables: Tables) {
  const names = new Map([
    [200002, "碎钱"],
    [200003, "足迹"],
    [200005, "万象礼券"],
    [200006, "街乐果冻"],
    [200014, "友邻服饰币"],
  ]);
  const rows = tables.byId(318, undefined, new Set(names.keys()));
  return (id: number) => {
    const name = names.get(id);
    if (!name) return null;
    const row = rows.get(id);
    assert.ok(
      row && tables.uint(row, 2) === 99 && tables.text(row, 1) === name,
      `Unknown payment identity ${id}`,
    );
    return [fieldSource(row, [0, 1, 2]), textSource(tables, tables.uint(row, 1)!, name)];
  };
}

export function readPurchaseOffers(
  tables: Tables,
  discovery: Pick<DiscoveryEvidence, "tracker">,
  dataRevision: number,
) {
  const { entrances, tvPageLinks, missingTvPages, testGroups } = readEntrances(tables);
  const currencyIdentity = currencyEvidence(tables);
  const proofs: FieldEvidence[] = [];
  function prove(collection: string, id: string, fieldPath: string, sources: EvidenceSource[]) {
    proofs.push({
      entity: { collection, id },
      fieldPath,
      sources,
      status: "confirmed",
      ruleId: `client.${collection}.${fieldPath}`,
      reasonCode: null,
    });
  }
  const shops = shopLabels.map(([id, name, key]): Shop => {
    const label = textSource(tables, key, name);
    prove("catalog.shops", id, "name", [label]);
    if (id !== "neighborWardrobe") return { id, name };
    prove("catalog.shops", id, "paymentNote", [
      textSource(tables, 88034602, "当「友邻服饰币」不足时，也可以使用等量碎钱换购"),
      ...currencyIdentity(200014)!,
      ...currencyIdentity(200002)!,
    ]);
    return { id, name, paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。" };
  });
  const purchaseOffers: PurchaseOffer[] = [];
  const offerIds = new Set<string>();
  function admit(
    offer: PurchaseOffer,
    shop: TableFieldSource[],
    item: TableFieldSource,
    currency: TableFieldSource[],
    price: TableFieldSource,
  ) {
    assert.ok(!offerIds.has(offer.id), `Duplicate purchase offer ${offer.id}`);
    offerIds.add(offer.id);
    purchaseOffers.push(offer);
    prove("catalog.purchaseOffers", offer.id, "shopId", shop);
    prove("catalog.purchaseOffers", offer.id, "deliveredItemId", [item]);
    prove("catalog.purchaseOffers", offer.id, "currencyItemId", currency);
    prove("catalog.purchaseOffers", offer.id, "price", [price]);
    return offer;
  }
  const tiers = tables.byId(663);
  const groups = new Map<number, Map<Shop["id"], Entrance[]>>();
  for (const entry of entrances) {
    const shopsByGroup = groups.get(entry.groupId) ?? new Map<Shop["id"], Entrance[]>();
    const pages = shopsByGroup.get(entry.shopId) ?? [];
    pages.push(entry);
    shopsByGroup.set(entry.shopId, pages);
    groups.set(entry.groupId, shopsByGroup);
  }
  const goods = tables.byId(659);
  const shelfOffers: ShelfOffer[] = [];
  const seenGroups = new Set<number>();
  for (const key of tiers.keys()) assert.ok(goods.has(key), `Unknown daily price goods ${key}`);
  const rows = [...goods.values()].map((row) => {
    const goodsId = tables.id(row);
    const groupId = tables.uint(row, 1);
    const itemId = tables.uint(row, 2);
    assert.ok(groupId && itemId);
    seenGroups.add(groupId);
    const amount = tables.uint(row, 10);
    const currency = tables.uint(row, 11);
    const tier = tiers.get(goodsId);
    const rawTier = tables.string(tier, 2);
    if (tier) assert.equal(tables.string(tier, 1), "SHOP_GOODS_PRICE_TYPE_DAILY_COUNT");
    const price = tier
      ? dailyPrice(rawTier)
      : amount === null
        ? null
        : { kind: "fixed" as const, amount };
    const paths = groups.get(groupId);
    const outcomes: { shopId: Shop["id"] | null; reason: string }[] = [];
    if (!paths)
      outcomes.push({
        shopId: null,
        reason: testGroups.has(groupId) ? "test_page" : "unlinked_goods_group",
      });
    for (const [shopId, pages] of paths ?? []) {
      const entry = pages[0]!;
      assert.ok(pages.every((page) => page.currency?.id === entry.currency?.id));
      let payment =
        currency === null ? entry.currency : { id: currency, source: fieldSource(row, [0, 11]) };
      if (!payment && shopId === "starryMarket" && goodsId === 8101 && itemId === 200007)
        payment = { id: 200006, source: textSource(tables, 974612840, "魔术券可用街乐果冻") };
      const identity = payment && currencyIdentity(payment.id);
      if (!payment || !identity || !price) {
        if (!identity) outcomes.push({ shopId, reason: "currency_unconfirmed" });
        if (!price) outcomes.push({ shopId, reason: "amount_missing" });
        continue;
      }
      const shopSources = [fieldSource(row, [0, 1]), ...pages.flatMap((page) => page.sources)];
      const offer = admit(
        {
          id: `${shopId}:${goodsId}`,
          shopId,
          deliveredItemId: itemId,
          currencyItemId: payment.id,
          price,
        },
        shopSources,
        fieldSource(row, [0, 2]),
        [
          ...(currency === null ? [fieldSource(row, [0, 1, 2, 11]), ...shopSources] : []),
          payment.source,
          ...identity,
        ],
        tier ? fieldSource(tier, [0, 1, 2]) : fieldSource(row, [0, 10]),
      );
      shelfOffers.push({ offer, row, pages, tier });
      outcomes.push({ shopId, reason: "admitted" });
    }
    return {
      goodsId,
      groupId,
      itemId,
      amount,
      currency,
      rawTier,
      tierSource: tier ? fieldSource(tier, [0, 1, 2]) : null,
      numericCandidates: [6, 7, 8, 9, 12, 13, 21, 22].map((field) => ({
        field,
        nativeValue: tables.uint(row, field),
      })),
      conditions: [17, 23].flatMap((field) => {
        const kind = tables.string(row, field);
        const parameters = tables.string(row, field + 1);
        if (kind === null && parameters === null) return [];
        assert.ok(!kind || kind.startsWith("SHOP_SALE_CONDITION_"));
        return [{ field, kind, parameters }];
      }),
      outcomes,
      source: fieldSource(row, [0, 1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 21, 22, 23, 24]),
    };
  });
  for (const { offer, note, sources } of readShelfNotes(
    shelfOffers,
    tables,
    discovery,
    dataRevision,
  )) {
    offer.note = note;
    prove("catalog.purchaseOffers", offer.id, "note", sources);
  }
  const giftIds = new Set<string>();
  const giftRows = tables.rows(672).map((row) => {
    const goodsId = tables.id(row);
    const itemId = tables.uint(row, 1);
    const amount = tables.uint(row, 4);
    const currency = tables.uint(row, 5);
    const identity = currency === null ? null : currencyIdentity(currency);
    const id = `giftGallery:${goodsId}:${itemId}`;
    if (itemId) {
      assert.ok(!giftIds.has(id), `Duplicate gift row ${id}`);
      giftIds.add(id);
    }
    const reasons = [];
    if (!itemId) reasons.push("delivered_item_missing");
    if (!identity) reasons.push("currency_unconfirmed");
    if (amount === null) reasons.push("amount_missing");
    if (itemId && currency && identity && amount !== null) {
      admit(
        {
          id,
          shopId: "giftGallery",
          deliveredItemId: itemId,
          currencyItemId: currency,
          price: { kind: "fixed", amount },
        },
        [fieldSource(row, [0, 1, 5]), textSource(tables, 1415967509, "万礼馆")],
        fieldSource(row, [0, 1]),
        [fieldSource(row, [0, 5]), ...identity],
        fieldSource(row, [0, 4]),
      );
      reasons.push("admitted");
    }
    return {
      goodsId,
      itemId,
      amount,
      currency,
      numericCandidates: [2, 3, 6].map((field) => ({
        field,
        nativeValue: tables.uint(row, field),
      })),
      reasons,
      source: fieldSource(row, [0, 1, 2, 3, 4, 5, 6]),
    };
  });
  const recycleCandidates = tables.rows(325).flatMap((row) => {
    const value = tables.uint(row, 14);
    return value === null
      ? []
      : [
          {
            itemId: tables.id(row),
            amountCandidate: value,
            relatedAmount: tables.uint(row, 13),
            reason: "sale_payment_and_unit_unconfirmed",
            source: fieldSource(row, [0, 13, 14]),
          },
        ];
  });
  purchaseOffers.sort((left, right) => left.id.localeCompare(right.id, "en"));
  return {
    data: { shops, purchaseOffers },
    proofs,
    diagnostics: {
      rows,
      giftRows,
      entrances,
      tvPageLinks,
      missingTvPages,
      emptyGroups: [...groups.keys()]
        .filter((id) => !seenGroups.has(id))
        .sort((left, right) => left - right),
      recycleCandidates,
    },
  };
}
