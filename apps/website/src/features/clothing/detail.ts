import { notFound } from "@tanstack/react-router";
import { loadClothing } from "./data";
import type { ClothingData } from "./data";
import type { ClothingCounterpart } from "./counterpart";
import {
  setDetailNavigation,
  type DetailNavigationModel,
} from "../collection/detail-navigation-model";
import type { NeighborClothingDetail } from "../neighbor-clothing/detail";

type PlayerClothingData = Pick<ClothingData, "items" | "sets" | "appearances">;
type PlayerClothingView = keyof PlayerClothingData;

export function parseClothingId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw notFound();
  return id;
}
export function clothingDetail(data: PlayerClothingData, view: PlayerClothingView, id: number) {
  const navigation = setDetailNavigation(data, id, "套装");
  if (view === "items") {
    const record = data.items.find((row) => row.id === id);
    if (!record) throw notFound();
    return {
      kind: "item" as const,
      record,
      navigation,
    };
  }
  if (view === "appearances") {
    const record = data.appearances.find((row) => row.id === id);
    if (!record) throw notFound();
    return { kind: "appearance" as const, record, navigation };
  }
  const record = data.sets.find((row) => row.id === id);
  if (!record) throw notFound();
  const items = new Map(data.items.map((item) => [item.id, item]));
  return {
    kind: "set" as const,
    record,
    navigation,
    items: record.componentIds === null ? null : record.componentIds.map((id) => items.get(id)!),
  };
}
export type ClothingDetail = ReturnType<typeof clothingDetail>;
export type ClothingPageDetail = (ClothingDetail | NeighborClothingDetail) & {
  navigation: DetailNavigationModel | null;
  counterpart: ClothingCounterpart | null;
};

export async function loadClothingDetail(
  view: PlayerClothingView,
  value: string,
): Promise<ClothingDetail> {
  const id = parseClothingId(value);
  return clothingDetail(await loadClothing(), view, id);
}
