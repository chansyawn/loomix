import type { Release } from "@loomix/schema/release";

export interface ReleaseCheckIssue {
  message: string;
  path?: string;
}

export interface ReleaseCheckResult {
  summary?: string;
  issues: readonly ReleaseCheckIssue[];
}

export interface ReleaseCheck {
  id: string;
  run(release: Release): ReleaseCheckResult | Promise<ReleaseCheckResult>;
}
