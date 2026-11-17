import type { GameplayTag } from "@loomix/schema/gameplay-tags";
import { TAG_FILTER_ROOT_NAMES } from "../../../src/features/all/tag-filter-policy.ts";
import { TAG_LABEL_OVERRIDES } from "../../../src/features/collection/tags.ts";
import { INGREDIENT_TAG_GROUPS } from "../../../src/features/ingredients/tag-filter-policy.ts";

export interface TagFilterFixture {
  tags: GameplayTag[];
  records: { id: number; tagIds: number[] }[];
}

function tag(
  id: number,
  internalName: string,
  parentId: number | null,
  displayName: string | null = null,
): GameplayTag {
  return { id, internalName, parentId, displayName };
}

export function allFilterFixture(): TagFilterFixture {
  const tags: GameplayTag[] = [];
  const records: TagFilterFixture["records"] = [];
  let nextId = 1;
  for (const rootName of TAG_FILTER_ROOT_NAMES) {
    const rootId = nextId++;
    tags.push(tag(rootId, rootName, null, rootName));
    const childId = nextId++;
    tags.push(tag(childId, `${rootName}_子项`, rootId, `${rootName}子项`));
    records.push({ id: rootId, tagIds: [childId] });
  }
  return { tags, records };
}

export function ingredientFixture(): TagFilterFixture {
  const tags: GameplayTag[] = [tag(1, "食材", null, "食材")];
  const records: TagFilterFixture["records"] = [];
  let nextId = 2;
  for (const group of INGREDIENT_TAG_GROUPS) {
    if (group.kind === "roots") {
      for (const name of group.rootNames) {
        const label = name.replace(/^食材_/, "");
        const rootId = nextId++;
        tags.push(tag(rootId, name, 1, label));
        const childId = nextId++;
        tags.push(tag(childId, `${name}_子项`, rootId, `${label}子项`));
        records.push({ id: childId, tagIds: [childId] });
      }
      continue;
    }
    const containerId = nextId++;
    tags.push(tag(containerId, group.rootName, 1, group.label));
    const childId = nextId++;
    tags.push(tag(childId, `${group.rootName}_子项`, containerId, `${group.label}子项`));
    records.push({ id: childId, tagIds: [childId] });
  }
  return { tags, records };
}

export function labelFixture(): GameplayTag[] {
  return Object.keys(TAG_LABEL_OVERRIDES).map((name, index) => tag(index + 1, name, null, name));
}
