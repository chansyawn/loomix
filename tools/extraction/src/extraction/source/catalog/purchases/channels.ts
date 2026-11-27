import assert from "node:assert/strict";
import type { Shop } from "@loomix/schema/catalog";
import type { TableRow } from "../../../types.ts";
import type { TableFieldSource } from "../../../evidence/domain-schema.ts";
import type { Tables } from "../../decode/tables.ts";

export function fieldSource(row: TableRow, fields: number[]): TableFieldSource {
  return {
    kind: "table",
    file: "prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  };
}

export function textSource(tables: Tables, key: number, excerpt: string): TableFieldSource {
  const entry = tables.textmap[key];
  assert.ok(entry?.nameZh?.includes(excerpt), `Unrecognized purchase text ${key}`);
  return fieldSource({ root: 1, rowOffset: entry.rowOffset }, [1]);
}

export interface Entrance {
  shopId: Shop["id"];
  pageId: number;
  groupId: number;
  sources: TableFieldSource[];
  currency: { id: number; source: TableFieldSource } | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface TvPageLink {
  storeId: number;
  tabId: number;
  pageList: string | null;
  pageId: number | null;
  groupId: number | null;
  reason: "empty_tab" | "missing_page" | "test_page" | "empty_page" | "linked";
  sources: TableFieldSource[];
}

export const shopLabels = [
  ["gelian", "格连商店", 34261523],
  ["luomiTv", "络米电视购", 180227290],
  ["neighborWardrobe", "友邻衣橱", 157822501],
  ["starryMarket", "星空街市", 1783769208],
  ["giftGallery", "万礼馆", 1415967509],
] as const;

export function readEntrances(tables: Tables) {
  const entrances: Entrance[] = [];
  const missingTvPages = new Set<number>();
  const tvPageLinks: TvPageLink[] = [];
  const testGroups = new Set<number>();
  const stores = tables.byId(661);
  for (const page of tables.byId(665).values()) {
    const storeId = tables.uint(page, 1);
    if (storeId !== 1 && storeId !== 8) continue;
    const store = stores.get(storeId);
    assert.ok(store);
    assert.equal(
      tables.string(store, 1),
      storeId === 1 ? "STORE_TYPE_NPC" : "STORE_TYPE_NPC_FRIEND",
    );
    const groupId = tables.uint(page, 6);
    assert.ok(groupId);
    entrances.push({
      shopId: storeId === 1 ? "gelian" : "neighborWardrobe",
      pageId: tables.id(page),
      groupId,
      sources: [fieldSource(store, [0, 1]), fieldSource(page, [0, 1, 6])],
      currency:
        storeId === 1 ? { id: 200002, source: textSource(tables, 2798898123, "用碎钱购买") } : null,
      startsAt: tables.string(page, 11),
      endsAt: tables.string(page, 12),
    });
  }
  const tvStores = tables.byId(712);
  const pages = tables.byId(713);
  for (const tab of tables.rows(714)) {
    const storeId = tables.uint(tab, 1);
    const store = tvStores.get(storeId);
    assert.ok(store);
    const storeName = tables.text(store, 2);
    assert.ok(storeName, `Missing TV store label ${storeId}`);
    const isTest = /test|测试/i.test(storeName);
    if (!isTest && storeId !== 1) continue;
    const list = tables.string(tab, 6);
    const link = {
      storeId: tables.id(store),
      tabId: tables.id(tab),
      pageList: list,
      sources: [fieldSource(store, [0, 2]), fieldSource(tab, [0, 1, 6])],
    };
    if (!list) {
      tvPageLinks.push({ ...link, pageId: null, groupId: null, reason: "empty_tab" });
      continue;
    }
    assert.ok(/^\d+(?:,\d+)*$/.test(list));
    for (const id of list.split(",").map(Number)) {
      const page = pages.get(id);
      if (!page) {
        tvPageLinks.push({ ...link, pageId: id, groupId: null, reason: "missing_page" });
        missingTvPages.add(id);
        continue;
      }
      const groupId = tables.uint(page, 6);
      const path = {
        ...link,
        pageId: id,
        groupId,
        sources: [...link.sources, fieldSource(page, [0, 4, 6])],
      };
      if (!groupId) {
        tvPageLinks.push({ ...path, reason: "empty_page" });
        continue;
      }
      const pageName = tables.text(page, 4);
      assert.ok(pageName, `Missing TV page label ${id}`);
      if (isTest || /test|测试/i.test(pageName)) {
        tvPageLinks.push({ ...path, reason: "test_page" });
        testGroups.add(groupId);
        continue;
      }
      tvPageLinks.push({ ...path, reason: "linked" });
      const currencyId = tables.uint(store, 3);
      entrances.push({
        shopId: "luomiTv",
        pageId: id,
        groupId,
        startsAt: null,
        endsAt: null,
        sources: path.sources,
        currency:
          currencyId === null ? null : { id: currencyId, source: fieldSource(store, [0, 3]) },
      });
    }
  }
  const labels = tables.byId(46);
  for (const row of tables.byId(47).values()) {
    const id = tables.id(row);
    const label = labels.get(id);
    const groupId = tables.uint(row, 1);
    assert.ok(label && groupId && tables.uint(label, 6) === groupId);
    entrances.push({
      shopId: "starryMarket",
      pageId: id,
      groupId,
      startsAt: null,
      endsAt: null,
      sources: [fieldSource(row, [0, 1]), fieldSource(label, [0, 4, 6])],
      currency: null,
    });
  }
  return {
    entrances,
    tvPageLinks,
    missingTvPages: [...missingTvPages].sort((left, right) => left - right),
    testGroups,
  };
}
