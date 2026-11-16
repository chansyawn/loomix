import { allTagFilterCheck } from "./checks/tag-filter/all.ts";
import { ingredientTagFilterCheck } from "./checks/tag-filter/ingredients.ts";
import { tagLabelCheck } from "./checks/tag-filter/labels.ts";
import type { ReleaseCheck } from "./types.ts";

export const releaseChecks: readonly ReleaseCheck[] = [
  allTagFilterCheck,
  ingredientTagFilterCheck,
  tagLabelCheck,
];

export {
  assertReleaseChecks,
  collectReleaseChecks,
  reportReleaseChecks,
  runReleaseChecks,
} from "./run.ts";
export type { ReleaseCheckOutcome } from "./run.ts";
export type { ReleaseCheck, ReleaseCheckIssue, ReleaseCheckResult } from "./types.ts";
