import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { catalogFixture, fixtureRequest, imageIndexFixture } from "../omnidex-fixture.ts";
import type { CreatureItem, CreatureSeries } from "../omnidex-view.ts";
import { createOmnidexCatalog } from "../omnidex/catalog";
import { entryOverview } from "../omnidex/entry-overview";
import { overviewFieldGroups } from "../omnidex/overview-fields";
import { creaturesDetail, loadCreaturesDetail, parseCreaturesId } from "./detail";
import { creaturesDetailPresentation } from "./detail-presentation";

const first: CreatureItem = {
  id: 1,
  name: "草鱼",
  image: null,
  quality: null,
  description: null,
  category: null,
  scientificName: null,
  region: null,
  habitat: null,
  activeSeasons: null,
  activeTimes: null,
  activeWeather: null,
  sizeRange: null,
};
const second: CreatureItem = { ...first, id: 2, name: "青鱼" };

const group: CreatureSeries = {
  id: 3,
  name: "河川鱼类",
  image: null,
  quality: null,
  description: null,
  seriesName: null,
  creatureIds: [2, 1],
};
const data = { items: [first, second], series: [group, { ...group, id: 4, creatureIds: [1] }] };

afterEach(() => vi.unstubAllGlobals());

describe("creatures details", () => {
  it("出没条件逐项列出地区、栖息地、季节、时段和天气，排在友邻喜好之前", () => {
    const fish = {
      ...first,
      region: "全地区",
      habitat: "河流、湖泊",
      activeSeasons: "春、夏",
      activeTimes: "白天",
    };
    const creatures = { items: [fish], series: [] };
    const { catalog, gameplayTags } = catalogFixture({ creatures });
    const index = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
    const overview = entryOverview(index, index.byId.get(fish.id)!);
    const detail = creaturesDetailPresentation(creaturesDetail(creatures, "items", fish.id));
    const preferences = { title: "友邻喜好", fields: [] };
    expect(overviewFieldGroups(overview, detail, [], preferences)).toMatchObject([
      { title: "基本信息" },
      {
        title: "出没条件",
        fields: [
          { label: "地区", value: "全地区" },
          { label: "栖息地", value: "河流、湖泊" },
          { label: "季节", value: "春、夏" },
          { label: "时段", value: "白天" },
          { label: "天气", value: null },
        ],
      },
      preferences,
    ]);
  });
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseCreaturesId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseCreaturesId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("shows all memberships and preserves missing item fields", () => {
    expect(creaturesDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      cooking: null,
      catalogItems: data.items,
      series: data.series,
    });
    expect(creaturesDetail({ ...data, series: [] }, "items", 1)).toMatchObject({ series: [] });
  });
  it("preserves member order and distinguishes unavailable from empty members", () => {
    expect(creaturesDetail(data, "series", 3)).toMatchObject({ items: [second, first] });
    expect(
      creaturesDetail({ ...data, series: [{ ...group, creatureIds: null }] }, "series", 3),
    ).toMatchObject({ items: null });
    expect(
      creaturesDetail({ ...data, series: [{ ...group, creatureIds: [] }] }, "series", 3),
    ).toMatchObject({ items: [] });
  });
  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["series", 1],
      ["items", 999],
    ] as const) {
      try {
        creaturesDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("loads real schema data and keeps network or validation failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ creatures: data }))));
    expect(await loadCreaturesDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadCreaturesDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadCreaturesDetail("items", "1")).rejects.toThrow();
  });
});
