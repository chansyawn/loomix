import { describe, expect, it } from "vite-plus/test";
import type { CreatureItem, CreatureSeries } from "@loomix/content-schema";
import { filterGroups, queryCreatures, seriesPreview } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";

function item(id: number, fields: Partial<CreatureItem> = {}): CreatureItem {
  return {
    id,
    name: `生物${id}`,
    image: null,
    description: null,
    quality: null,
    category: null,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
    ...fields,
  };
}
const items = [
  item(1, {
    name: "春鱼",
    quality: 2,
    category: "水生生物",
    region: "禾夏",
    habitat: "河流",
    activeSeasons: "春季，夏季",
    activeTimes: "白天",
    activeWeather: "雨天",
  }),
  item(2, {
    name: "常见鱼",
    quality: 0,
    category: "水生生物",
    region: "全地区",
    habitat: "河流",
    activeSeasons: "全年",
    activeTimes: "全天",
    activeWeather: "任意天气",
  }),
  item(3, {
    name: "雪虫",
    quality: 3,
    category: "陆地生物",
    region: "禾夏H83区星屿特产",
    habitat: "草地",
    activeSeasons: "冬季，春季",
    activeTimes: "夜晚",
    activeWeather: "雪天",
  }),
  item(4),
  item(5, {
    name: "Alpha",
    quality: 2,
    activeSeasons: "夏季",
    activeTimes: "白天",
    activeWeather: "晴天",
  }),
];
const series: CreatureSeries[] = [
  {
    id: 100,
    name: "河流系列",
    image: null,
    description: null,
    quality: 1,
    seriesName: null,
    creatureIds: [2, 1],
  },
  {
    id: 101,
    name: "春季系列",
    image: null,
    description: null,
    quality: 2,
    seriesName: null,
    creatureIds: [1, 3],
  },
];
const data = { items, series };
const ids = (rows: { id: number }[]) => rows.map((row) => row.id);
const search = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
  queryCreatures(data, "items", { ...emptyQuery(), ...patch });

describe("creature catalog", () => {
  it("returns the full catalog in original order and searches names", () => {
    expect(queryCreatures(data, "items", emptyQuery()).rows).toEqual(items);
    expect(queryCreatures(data, "series", emptyQuery()).rows).toEqual(series);
    expect(ids(search({ q: " 鱼 " }).rows)).toEqual([1, 2]);
    expect(ids(search({ q: "ALPHA" }).rows)).toEqual([5]);
    expect(search({ q: "不存在" }).total).toBe(0);
    expect(queryCreatures({ items: [], series: [] }, "items", emptyQuery()).total).toBe(0);
  });
  it("combines choices with OR and groups with AND", () => {
    expect(
      ids(
        search({ categories: ["水生生物", "陆地生物"], habitats: ["河流"], qualities: ["2", "3"] })
          .rows,
      ),
    ).toEqual([1]);
  });
  it("matches individual seasons and includes year-round creatures", () => {
    expect(ids(search({ seasons: ["春季"] }).rows)).toEqual([1, 2, 3]);
    expect(ids(search({ seasons: ["夏季"] }).rows)).toEqual([1, 2, 5]);
    expect(ids(search({ seasons: ["秋季"] }).rows)).toEqual([2]);
    expect(ids(search({ seasons: ["全年"] }).rows)).toEqual([2]);
    expect(ids(search({ seasons: ["夏季", "冬季"] }).rows)).toEqual([1, 2, 3, 5]);
  });
  it("includes unrestricted times and weather only for concrete conditions", () => {
    expect(ids(search({ times: ["白天"], weather: ["雨天"] }).rows)).toEqual([1, 2]);
    expect(ids(search({ times: ["夜晚"], weather: ["雪天"] }).rows)).toEqual([2, 3]);
    expect(ids(search({ weather: ["晴天"] }).rows)).toEqual([2, 5]);
    expect(ids(search({ times: ["全天"] }).rows)).toEqual([2]);
    expect(ids(search({ weather: ["任意天气"] }).rows)).toEqual([2]);
    expect(ids(search({ times: [missing], weather: [missing], seasons: [missing] }).rows)).toEqual([
      4,
    ]);
  });
  it("matches original region labels without inferred hierarchies", () => {
    expect(ids(search({ regions: ["禾夏"] }).rows)).toEqual([1]);
    expect(ids(search({ regions: ["全地区"] }).rows)).toEqual([2]);
    expect(ids(search({ regions: ["禾夏H83区星屿特产"] }).rows)).toEqual([3]);
  });
  it("supports overlapping series, ungrouped records and missing attributes", () => {
    expect(ids(search({ series: ["100", "101"] }).rows)).toEqual([1, 2, 3]);
    expect(ids(search({ series: [ungrouped] }).rows)).toEqual([4, 5]);
    expect(ids(search({ qualities: [missing] }).rows)).toEqual([4]);
    expect(ids(search({ regions: [missing], habitats: [missing] }).rows)).toEqual([4, 5]);
    expect(ids(search({ categories: [missing] }).rows)).toEqual([4, 5]);
    const groups = filterGroups(data);
    expect(groups.find((group) => group.key === "seasons")?.options).toContainEqual({
      value: "秋季",
      label: "秋季",
    });
    expect(groups.find((group) => group.key === "weather")?.options).toContainEqual({
      value: "晴天",
      label: "晴天",
    });
    expect(groups.find((group) => group.key === "times")?.options).toContainEqual({
      value: missing,
      label: "未提供",
    });
  });
  it("sorts stably, keeps missing quality last and leaves input unchanged", () => {
    expect(ids(search({ sort: "quality-desc" }).rows)).toEqual([3, 1, 5, 2, 4]);
    expect(ids(search({ sort: "quality-asc" }).rows)).toEqual([2, 1, 5, 3, 4]);
    const names = { items: [item(1, { name: "Beta" }), item(2, { name: "Alpha" })], series: [] };
    expect(ids(queryCreatures(names, "items", { ...emptyQuery(), sort: "name-asc" }).rows)).toEqual(
      [2, 1],
    );
    expect(
      ids(queryCreatures(names, "items", { ...emptyQuery(), sort: "name-desc" }).rows),
    ).toEqual([1, 2]);
    expect(ids(items)).toEqual([1, 2, 3, 4, 5]);
    expect(
      ids(queryCreatures(data, "series", { ...emptyQuery(), q: "春", qualities: ["2"] }).rows),
    ).toEqual([101]);
  });
  it("previews the first four pictured members in membership order", () => {
    const pictured = Array.from({ length: 6 }, (_, index) =>
      item(index + 1, { image: index === 1 ? null : `image-${index}` }),
    );
    const group = { ...series[0]!, creatureIds: [6, 2, 5, 4, 3, 1] };
    expect(ids(seriesPreview(group, pictured))).toEqual([6, 5, 4, 3]);
    expect(seriesPreview({ ...group, creatureIds: null }, pictured)).toEqual([]);
    expect(seriesPreview({ ...group, creatureIds: [] }, pictured)).toEqual([]);
    expect(seriesPreview(series[0]!, items)).toEqual([]);
  });
});
