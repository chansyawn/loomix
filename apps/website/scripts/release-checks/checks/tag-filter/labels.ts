import type { GameplayTag } from "@loomix/schema/gameplay-tags";
import { TAG_LABEL_OVERRIDES } from "../../../../src/features/omnidex/tags.ts";
import type { ReleaseCheck, ReleaseCheckResult } from "../../types.ts";

export function checkTagLabels(tags: readonly GameplayTag[]): ReleaseCheckResult {
  const names = new Set(tags.map((tag) => tag.internalName));
  const issues = Object.keys(TAG_LABEL_OVERRIDES)
    .filter((name) => !names.has(name))
    .map((name) => ({ path: "gameplay-tags", message: `命名特例指向不存在的标签：${name}` }));
  return {
    issues,
    summary: `${Object.keys(TAG_LABEL_OVERRIDES).length} 个命名特例`,
  };
}

export const tagLabelCheck: ReleaseCheck = {
  id: "tag-filter/labels",
  run: (release) => checkTagLabels(release.dataset.gameplayTags.tags),
};
