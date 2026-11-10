import { assertValid } from "../common/identity.ts";
import type { GameplayTag } from "./index.ts";
import { validateGameplayTags } from "./validate.ts";

export function createGameplayTagIndex(tags: readonly GameplayTag[]) {
  assertValid(validateGameplayTags(tags));
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const byName = new Map(tags.map((tag) => [tag.internalName, tag]));
  const byEnum = new Map<string, GameplayTag[]>();
  for (const tag of tags) {
    if (tag.enumName === null) continue;
    const matches = byEnum.get(tag.enumName) ?? [];
    matches.push(tag);
    byEnum.set(tag.enumName, matches);
  }
  const get = (id: number): GameplayTag => {
    const tag = byId.get(id);
    if (!tag) throw new Error(`Unknown GameplayTag ${id}`);
    return tag;
  };
  const ancestors = (id: number): GameplayTag[] => {
    const result: GameplayTag[] = [];
    let tag: GameplayTag | undefined = get(id);
    while (tag) {
      result.push(tag);
      tag = tag.parentId === null ? undefined : get(tag.parentId);
    }
    return result;
  };
  const ancestry = new Map(
    tags.map((tag) => [tag.id, new Set(ancestors(tag.id).map((t) => t.id))]),
  );
  const select = (ids: readonly number[], rootId: number): GameplayTag[] => {
    get(rootId);
    return ids.map(get).filter((tag) => ancestry.get(tag.id)!.has(rootId));
  };
  return {
    get,
    findByName: (name: string) => byName.get(name),
    findByEnumName: (name: string): readonly GameplayTag[] => byEnum.get(name) ?? [],
    ancestors,
    subtree: (id: number) =>
      select(
        tags.map((tag) => tag.id),
        id,
      ),
    select,
  };
}
export type GameplayTagIndex = ReturnType<typeof createGameplayTagIndex>;
