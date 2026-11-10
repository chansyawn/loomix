import type { GameplayTag } from "./index.ts";
import type { ValidationIssue } from "../common/identity.ts";

export function validateGameplayTags(tags: readonly GameplayTag[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const ids = new Set<number>();
  const names = new Set<string>();
  for (const [index, tag] of tags.entries()) {
    const issue = (message: string) =>
      issues.push({ code: "invalid_tag", path: ["gameplayTags", "tags", index], message });
    if (ids.has(tag.id)) issue(`Duplicate tag ID ${tag.id}`);
    if (names.has(tag.internalName)) issue(`Duplicate tag name ${tag.internalName}`);
    ids.add(tag.id);
    names.add(tag.internalName);
    const seen = new Set<number>();
    let current: GameplayTag | undefined = tag;
    while (current) {
      if (seen.has(current.id)) {
        issue("Tag parent cycle");
        break;
      }
      seen.add(current.id);
      if (current.parentId === null) break;
      if (!byId.has(current.parentId)) issue(`Unknown parent tag ${current.parentId}`);
      current = byId.get(current.parentId);
    }
  }
  return issues;
}
