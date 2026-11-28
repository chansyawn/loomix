import { profile } from "../../profile.ts";
import type { IndexedAsset } from "../types.ts";
import type { DiaryKind } from "./model.ts";

export const imageFolders = {
  social: "uisprite/load/social",
  interior: "uisprite/load/bigpic/npchousepic",
  item: "uisprite/load/item",
  diary: "uisprite/load/bigpic/starbay",
  atlas: "uisprite/load/starbay/img_starbay_diary_player_003.png",
  spine: "ui/companionstar/starbay/spine",
};

const diaryPatterns: [DiaryKind, RegExp, string][] = [
  ["decoration", /^img_starbay_diary_(\d+)[a-z]+_(\d+)$/, imageFolders.atlas],
  ["page", /^img_starbay_diary_book_(\d+)_(\d+)$/, imageFolders.diary],
  ["share", /^img_starbay_diary_share_pic_(\d+)$/, imageFolders.diary],
  ["book-large", /^img_starbay_diary_book_pic_big_(\d+)$/, imageFolders.atlas],
  ["book-small", /^img_starbay_diary_book_pic_small_(\d+)$/, imageFolders.diary],
  ["letter", /^img_starbay_diary_book_letter_bg_(\d+)$/, imageFolders.diary],
  ["text", /^img_starbay_diary_book_txt_(\d+)$/, imageFolders.atlas],
  ["spine", /^spine_starbaydiary_(\d+)$/, imageFolders.spine],
];

export function spritePath(path: string): string {
  return path
    .replaceAll("\\", "/")
    .toLowerCase()
    .replace(/\.png$/, "");
}

type Sprite = IndexedAsset & { Name: string; Container: string };
type DiaryGroup = { kind: DiaryKind; sequence: number | null; candidates: Sprite[] };
function activeSprite(candidates: Sprite[], label: string): Sprite {
  const overlays = candidates.filter((asset) => /\/persistent\//i.test(asset.Source));
  const active = overlays.length ? overlays : candidates;
  const identities = new Set(active.map((asset) => `${asset.Source}:${asset.PathID}`));
  if (identities.size !== 1)
    throw new Error(
      `Expected one active Sprite for ${label}, found [${[...identities].join(", ")}]`,
    );
  return active[0]!;
}

export function neighborSprites(index: readonly IndexedAsset[], ids: ReadonlySet<number>) {
  const byPath = new Map<string, Sprite[]>();
  const diary = new Map<number, Map<string, DiaryGroup>>();
  for (const entry of index) {
    if (entry.Type !== "Sprite" || !entry.Name || !entry.Container) continue;
    const name = entry.Name.toLowerCase(),
      container = entry.Container.toLowerCase();
    if (!container.startsWith(profile.assetPrefix)) continue;
    const relative = container.slice(profile.assetPrefix.length);
    const asset = { ...entry, Name: entry.Name, Container: entry.Container };
    const folder = relative.slice(0, relative.lastIndexOf("/"));
    if (
      relative === `${folder}/${name}.png` &&
      (folder === imageFolders.social ||
        folder === imageFolders.interior ||
        folder === imageFolders.item)
    ) {
      const key = spritePath(relative);
      const group = byPath.get(key) ?? [];
      group.push(asset);
      byPath.set(key, group);
      continue;
    }
    for (const [kind, pattern, location] of diaryPatterns) {
      if (relative !== (location === imageFolders.atlas ? location : `${location}/${name}.png`))
        continue;
      const match = name.match(pattern);
      if (!match || !ids.has(Number(match[1]))) continue;
      const id = Number(match[1]),
        sequence = match[2] ? Number(match[2]) : null;
      const key = `${kind}:${sequence}`;
      const slots = diary.get(id) ?? new Map<string, DiaryGroup>();
      const group = slots.get(key) ?? { kind, sequence, candidates: [] };
      group.candidates.push(asset);
      slots.set(key, group);
      diary.set(id, slots);
    }
  }
  return {
    configured(reference: string) {
      return activeSprite(byPath.get(spritePath(reference)) ?? [], reference);
    },
    diary(id: number) {
      return [...(diary.get(id)?.values() ?? [])]
        .sort(
          (left, right) =>
            left.kind.localeCompare(right.kind, "en") ||
            (left.sequence ?? 0) - (right.sequence ?? 0),
        )
        .map(({ kind, sequence, candidates }) => ({
          kind,
          sequence,
          asset: activeSprite(candidates, `neighbor ${id} diary ${kind} ${sequence ?? ""}`),
        }));
    },
  };
}
