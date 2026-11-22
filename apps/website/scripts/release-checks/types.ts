import type { WebsiteResources } from "@loomix/schema/website-resources";

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
  run(resources: WebsiteResources): ReleaseCheckResult | Promise<ReleaseCheckResult>;
}
