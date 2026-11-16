import type { Release } from "@loomix/schema/release";
import type { ReleaseCheck, ReleaseCheckIssue } from "./types.ts";

export interface ReleaseCheckOutcome {
  check: ReleaseCheck;
  summary?: string;
  issues: readonly ReleaseCheckIssue[];
  error?: unknown;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function collectReleaseChecks(
  release: Release,
  checks: readonly ReleaseCheck[],
): Promise<ReleaseCheckOutcome[]> {
  const ids = new Set<string>();
  for (const check of checks) {
    if (ids.has(check.id)) throw new Error(`发布契约检查 ID 重复：${check.id}`);
    ids.add(check.id);
  }
  const outcomes: ReleaseCheckOutcome[] = [];
  for (const check of checks) {
    try {
      const result = await check.run(release);
      outcomes.push({ check, summary: result.summary, issues: result.issues });
    } catch (error) {
      outcomes.push({
        check,
        issues: [{ message: `检查执行失败：${errorMessage(error)}` }],
        error,
      });
    }
  }
  return outcomes;
}

function issueCount(outcomes: readonly ReleaseCheckOutcome[]): number {
  return outcomes.reduce((count, outcome) => count + outcome.issues.length, 0);
}

export function reportReleaseChecks(outcomes: readonly ReleaseCheckOutcome[]): void {
  for (const outcome of outcomes) {
    if (outcome.issues.length === 0) {
      console.log(
        outcome.summary ? `✓ ${outcome.check.id}：${outcome.summary}` : `✓ ${outcome.check.id}`,
      );
      continue;
    }
    console.error(`✗ ${outcome.check.id}`);
    for (const issue of outcome.issues)
      console.error(`  - ${issue.path ? `${issue.path}：` : ""}${issue.message}`);
    if (outcome.error) console.error(outcome.error);
  }
}

export function assertReleaseChecks(outcomes: readonly ReleaseCheckOutcome[]): void {
  const count = issueCount(outcomes);
  if (count > 0) throw new Error(`发布契约检查失败：${count} 项问题`);
  console.log(`发布契约检查通过：${outcomes.length} 项检查`);
}

export async function runReleaseChecks(
  release: Release,
  checks: readonly ReleaseCheck[],
): Promise<void> {
  const outcomes = await collectReleaseChecks(release, checks);
  reportReleaseChecks(outcomes);
  assertReleaseChecks(outcomes);
}
