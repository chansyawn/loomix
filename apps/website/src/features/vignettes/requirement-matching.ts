import { isListedItem, type Item } from "@loomix/schema/catalog";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import type { Vignette } from "@loomix/schema/vignettes";

type Requirement = Vignette["requirements"][number];
export type RequirementTarget = Requirement["target"];
export type RequirementSize = { label: string; tagId: number | undefined };

export function resolveRequirementSize(
  area: Requirement["area"],
  tagIndex: GameplayTagIndex,
): RequirementSize | undefined {
  if (!area) return;
  const width = area.width / 2;
  const height = area.height / 2;
  const tagName = `尺寸_${width}_${height}`.replaceAll(".", "a");
  return { label: `${width} × ${height}`, tagId: tagIndex.findByName(tagName)?.id };
}

export function createRequirementMatcher(tagIndex: GameplayTagIndex) {
  const ancestryByTag = new Map<number, readonly number[]>();
  const tagsByItem = new WeakMap<Item, ReadonlySet<number>>();

  function itemTags(item: Item) {
    const cached = tagsByItem.get(item);
    if (cached) return cached;
    const tags = new Set<number>();
    if (isListedItem(item)) {
      for (const tagId of item.tagIds) {
        let ancestry = ancestryByTag.get(tagId);
        if (!ancestry) {
          ancestry = tagIndex.ancestors(tagId).map((tag) => tag.id);
          ancestryByTag.set(tagId, ancestry);
        }
        for (const id of ancestry) tags.add(id);
      }
    }
    tagsByItem.set(item, tags);
    return tags;
  }

  return (item: Item, target: RequirementTarget, size?: RequirementSize) => {
    if ("itemId" in target) return item.id === target.itemId;
    if (!isListedItem(item)) return false;
    if (
      size &&
      (item.kind !== "furniture" || size.tagId === undefined || !item.tagIds.includes(size.tagId))
    ) {
      return false;
    }
    const tags = itemTags(item);
    return target.allTagIds.every((tagId) => tags.has(tagId));
  };
}

export function findVignetteUses(
  templates: readonly Vignette[],
  item: Item,
  tagIndex: GameplayTagIndex,
) {
  if (!isListedItem(item)) return [];
  const matches = createRequirementMatcher(tagIndex);
  return templates.flatMap((template) => {
    const conditions = template.requirements.flatMap((requirement, index) => {
      const position = index + 1;
      const roles = [
        {
          role: "摆放物",
          target: requirement.target,
          size: resolveRequirementSize(requirement.area, tagIndex),
        },
        { role: "承载物", target: requirement.support },
      ];
      return roles.flatMap(({ role, target, size }) =>
        target && matches(item, target, size)
          ? [
              {
                position,
                role,
                target,
                label: requirement.label.zh,
                quantity: requirement.quantity,
              },
            ]
          : [],
      );
    });
    return conditions.length ? [{ template, conditions }] : [];
  });
}
