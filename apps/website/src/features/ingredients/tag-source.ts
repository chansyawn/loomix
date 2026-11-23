import type { GameplayTag, GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { resolveTagFilterLabel } from "../omnidex/tags.ts";
import {
  INGREDIENT_LABEL_POLICY,
  INGREDIENT_TAG_GROUPS,
  type IngredientTagGroupKey,
} from "./tag-filter-policy.ts";

export interface IngredientTag {
  id: number;
  internalName: string;
  name: string;
  parentId: number | null;
  group: IngredientTagGroupKey;
}

export interface IngredientTagSource {
  tags: readonly IngredientTag[];
  byId: ReadonlyMap<number, IngredientTag>;
  childrenByParentId: ReadonlyMap<number, readonly number[]>;
  visibleIds: ReadonlySet<number>;
  tagIdsByItemId: ReadonlyMap<number, ReadonlySet<number>>;
  itemIds: readonly number[];
  groupRootIds: Record<IngredientTagGroupKey, readonly number[]>;
}

function emptySource(): IngredientTagSource {
  return {
    tags: [],
    byId: new Map(),
    childrenByParentId: new Map(),
    visibleIds: new Set(),
    tagIdsByItemId: new Map(),
    itemIds: [],
    groupRootIds: {
      ingredientCategories: [],
      ingredientColors: [],
      ingredientQualities: [],
    },
  };
}

function sorted(values: Iterable<number>): number[] {
  return [...values].sort((a, b) => a - b);
}

export function createIngredientTagSource(
  index: GameplayTagIndex,
  items: readonly { id: number; tagIds: readonly number[] }[],
): IngredientTagSource {
  const root = index.findByName("食材");
  if (!root) return emptySource();
  const subtree = index.subtree(root.id).sort((a, b) => a.id - b.id);
  const subtreeById = new Map(subtree.map((tag) => [tag.id, tag]));
  const childrenOf = new Map<number, number[]>();
  for (const tag of subtree) {
    if (tag.parentId === null) continue;
    const children = childrenOf.get(tag.parentId) ?? [];
    children.push(tag.id);
    childrenOf.set(tag.parentId, children);
  }

  const structuralIds = new Set<number>([root.id]);
  const groupOfRoot = new Map<number, IngredientTagGroupKey>();
  const childrenKindRootIds = new Map<IngredientTagGroupKey, number>();
  const configuredRootIds = new Map<IngredientTagGroupKey, readonly number[]>();
  for (const config of INGREDIENT_TAG_GROUPS) {
    if (config.kind === "roots") {
      const ids = config.rootNames
        .map((name) => index.findByName(name)?.id)
        .filter((id): id is number => id !== undefined);
      if (ids.length === 0) continue;
      for (const id of ids) groupOfRoot.set(id, config.key);
      configuredRootIds.set(config.key, ids);
      continue;
    }
    const container = index.findByName(config.rootName);
    if (!container) continue;
    structuralIds.add(container.id);
    groupOfRoot.set(container.id, config.key);
    childrenKindRootIds.set(config.key, container.id);
    configuredRootIds.set(config.key, childrenOf.get(container.id) ?? []);
  }

  const groupOfNode = new Map<number, IngredientTagGroupKey>();
  for (const tag of subtree) {
    if (tag.id === root.id || structuralIds.has(tag.id)) continue;
    const seen = new Set<number>();
    let current: GameplayTag | undefined = tag;
    while (current && current.id !== root.id && !seen.has(current.id)) {
      seen.add(current.id);
      const group = groupOfRoot.get(current.id);
      if (group) {
        groupOfNode.set(tag.id, group);
        break;
      }
      current = current.parentId === null ? undefined : subtreeById.get(current.parentId);
    }
  }

  const tags: IngredientTag[] = subtree
    .filter((tag) => groupOfNode.has(tag.id))
    .map((tag) => ({
      id: tag.id,
      internalName: tag.internalName,
      name: resolveTagFilterLabel(tag, INGREDIENT_LABEL_POLICY),
      parentId: tag.parentId,
      group: groupOfNode.get(tag.id)!,
    }));
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const nodeIds = new Set(byId.keys());
  const childrenByParentId = new Map<number, number[]>();
  for (const tag of tags) {
    if (tag.parentId === null) continue;
    const children = childrenByParentId.get(tag.parentId) ?? [];
    children.push(tag.id);
    childrenByParentId.set(tag.parentId, children);
  }

  const tagIdsByItemId = new Map<number, Set<number>>();
  for (const item of items) {
    const closure = new Set<number>();
    for (const tagId of item.tagIds) {
      for (const ancestor of index.ancestors(tagId)) {
        if (ancestor.id === root.id) break;
        if (nodeIds.has(ancestor.id)) closure.add(ancestor.id);
      }
    }
    if (closure.size > 0) tagIdsByItemId.set(item.id, closure);
  }

  const itemIdsByTag = new Map<number, number[]>();
  for (const [itemId, closure] of tagIdsByItemId)
    for (const tagId of closure) {
      const ids = itemIdsByTag.get(tagId) ?? [];
      ids.push(itemId);
      itemIdsByTag.set(tagId, ids);
    }
  const sortedItemIdsByTag = new Map(
    [...itemIdsByTag].map(([tagId, ids]) => [tagId, sorted(new Set(ids))] as const),
  );

  const referenced = new Set<number>();
  for (const closure of tagIdsByItemId.values()) for (const tagId of closure) referenced.add(tagId);
  const visibleIds = new Set<number>();
  const visited = new Set<number>();
  const visit = (tagId: number): boolean => {
    if (visited.has(tagId)) return visibleIds.has(tagId);
    visited.add(tagId);
    let visible = referenced.has(tagId);
    for (const childId of childrenByParentId.get(tagId) ?? []) if (visit(childId)) visible = true;
    if (visible) visibleIds.add(tagId);
    return visible;
  };
  for (const tag of tags) visit(tag.id);

  const walkTag = (tagId: number, order: number[], seen: Set<number>) => {
    for (const itemId of sortedItemIdsByTag.get(tagId) ?? [])
      if (!seen.has(itemId)) {
        seen.add(itemId);
        order.push(itemId);
      }
    for (const childId of childrenByParentId.get(tagId) ?? []) walkTag(childId, order, seen);
  };
  const itemIds: number[] = [];
  const seenItems = new Set<number>();
  for (const config of INGREDIENT_TAG_GROUPS)
    for (const rootId of configuredRootIds.get(config.key) ?? [])
      if (visibleIds.has(rootId)) walkTag(rootId, itemIds, seenItems);
  for (const itemId of tagIdsByItemId.keys())
    if (!seenItems.has(itemId)) {
      seenItems.add(itemId);
      itemIds.push(itemId);
    }

  const groupRootIds = {} as Record<IngredientTagGroupKey, readonly number[]>;
  for (const config of INGREDIENT_TAG_GROUPS) {
    const containerId = childrenKindRootIds.get(config.key);
    const candidates = containerId
      ? (childrenByParentId.get(containerId) ?? [])
      : (configuredRootIds.get(config.key) ?? []);
    groupRootIds[config.key] = candidates.filter((id) => visibleIds.has(id));
  }

  return {
    tags,
    byId,
    childrenByParentId,
    visibleIds,
    tagIdsByItemId,
    itemIds,
    groupRootIds,
  };
}
