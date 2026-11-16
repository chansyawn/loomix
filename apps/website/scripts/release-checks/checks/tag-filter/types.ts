import type { GameplayTag } from "@loomix/schema/gameplay-tags";

export interface TagFilterInput {
  tags: readonly GameplayTag[];
  records: readonly { id: number; tagIds: readonly number[] }[];
}
