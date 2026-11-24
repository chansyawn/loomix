import type { HairDyeing } from "./index.ts";

type FlowerRule = HairDyeing["flowerRules"][number];

function pairKey(first: string, second: string): string {
  return JSON.stringify(first <= second ? [first, second] : [second, first]);
}

export function createFlowerDyeingMatcher(
  data: Pick<HairDyeing, "flowerInputs" | "flowerRules" | "colorGroups">,
) {
  const groups = new Map(data.colorGroups.map(({ id, unlock }) => [id, unlock]));
  const ordered = data.flowerRules
    .filter((rule) => groups.get(rule.groupId)?.flowerMatchEnabled)
    .sort(
      (left, right) =>
        groups.get(left.groupId)!.sort - groups.get(right.groupId)!.sort || left.id - right.id,
    );
  const single = new Map<string, FlowerRule>();
  const pairs = new Map<string, FlowerRule>();
  for (const rule of ordered) {
    if (rule.singleTag && !single.has(rule.singleTag)) single.set(rule.singleTag, rule);
    if (rule.pairTags) {
      const key = pairKey(...rule.pairTags);
      if (!pairs.has(key)) pairs.set(key, rule);
    }
  }
  const tags = new Map(
    data.flowerInputs.map(({ itemId, colorTags }) => {
      if (colorTags.length === 1) return [itemId, colorTags[0]];
      const rule = pairs.get(pairKey(colorTags[0], colorTags[1]));
      return [itemId, rule?.singleTag ?? rule?.outputTag ?? null];
    }),
  );
  return (firstItemId: number, secondItemId?: number): FlowerRule | null => {
    const first = tags.get(firstItemId);
    if (!first || firstItemId === secondItemId) return null;
    if (secondItemId === undefined) return single.get(first) ?? null;
    const second = tags.get(secondItemId);
    return second ? (pairs.get(pairKey(first, second)) ?? null) : null;
  };
}
