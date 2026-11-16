import { assertValid } from "../common/identity.ts";
import type { GameplayTag } from "./index.ts";
import { validateGameplayTags } from "./validate.ts";

// 泛型保留调用方的扩展字段，例如提取侧仍需客户端枚举名。
export function createGameplayTagIndex<T extends GameplayTag>(tags: readonly T[]) {
  assertValid(validateGameplayTags(tags));
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const byName = new Map(tags.map((tag) => [tag.internalName, tag]));
  const get = (id: number): T => {
    const tag = byId.get(id);
    if (!tag) throw new Error(`Unknown GameplayTag ${id}`);
    return tag;
  };
  const ancestors = (id: number): T[] => {
    const result: T[] = [];
    let tag: T | undefined = get(id);
    while (tag) {
      result.push(tag);
      tag = tag.parentId === null ? undefined : get(tag.parentId);
    }
    return result;
  };
  const ancestry = new Map(
    tags.map((tag) => [tag.id, new Set(ancestors(tag.id).map((t) => t.id))]),
  );
  const select = (ids: readonly number[], rootId: number): T[] => {
    get(rootId);
    return ids.map(get).filter((tag) => ancestry.get(tag.id)!.has(rootId));
  };
  return {
    tags,
    get,
    findByName: (name: string) => byName.get(name),
    ancestors,
    subtree: (id: number) =>
      select(
        tags.map((tag) => tag.id),
        id,
      ),
    select,
  };
}
export type GameplayTagIndex<T extends GameplayTag = GameplayTag> = ReturnType<
  typeof createGameplayTagIndex<T>
>;
