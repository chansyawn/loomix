import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { verifyPreview, retryPreview } from "./verify-preview.ts";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

const execute = promisify(execFile);
const worker = "loomix-website";
const marker = "<!-- loomix-website-preview -->";
const pullRequestSchema = z.object({
  state: z.enum(["open", "closed"]),
  head: z.object({ sha: z.string(), repo: z.object({ full_name: z.string() }).nullable() }),
});
const commentSchema = z.object({
  id: z.number(),
  body: z.string().nullable(),
  user: z.object({ login: z.string() }),
});

function environment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

async function github(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const repository = environment("GITHUB_REPOSITORY");
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${environment("GH_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path} returned HTTP ${response.status}`);
  return response.json();
}

async function currentPullRequest(number: number) {
  return pullRequestSchema.parse(await github(`pulls/${number}`));
}

async function comment(number: number, message: string): Promise<void> {
  const body = `${marker}\n${message}`;
  for (let page = 1; ; page++) {
    const comments = z
      .array(commentSchema)
      .parse(await github(`issues/${number}/comments?per_page=100&page=${page}`));
    const previous = comments.find(
      (item) => item.user.login === "github-actions[bot]" && item.body?.startsWith(marker),
    );
    if (previous) {
      await github(`issues/comments/${previous.id}`, "PATCH", { body });
      return;
    }
    if (comments.length < 100) break;
  }
  await github(`issues/${number}/comments`, "POST", { body });
}

async function previewRequest(number: number, method: "GET" | "DELETE"): Promise<unknown> {
  const account = environment("CLOUDFLARE_ACCOUNT_ID");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/workers/${worker}/previews/pr-${number}`,
    {
      method,
      headers: { Authorization: `Bearer ${environment("CLOUDFLARE_API_TOKEN")}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (method === "DELETE" && response.status === 404) return;
  if (!response.ok)
    throw new Error(`Cloudflare Preview ${method} returned HTTP ${response.status}`);
  const body = z.object({ success: z.boolean(), result: z.unknown() }).parse(await response.json());
  if (!body.success) throw new Error(`Cloudflare Preview ${method} failed`);
  return body.result;
}

async function removePreview(number: number): Promise<void> {
  await previewRequest(number, "DELETE");
  await comment(number, "预览环境已清理。");
}

async function deploy(number: number, sha: string): Promise<void> {
  const current = await currentPullRequest(number);
  if (current.state === "closed") {
    await removePreview(number);
    throw new Error("PR is closed");
  }
  if (current.head.repo?.full_name !== environment("GITHUB_REPOSITORY")) {
    throw new Error("Preview deployment requires a branch in this repository");
  }
  if (current.head.sha !== sha) throw new Error("PR changed; a newer workflow must deploy it");
  await comment(number, `正在发布预览。\n\n提交 ${sha}`);
  await execute(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "preview",
      "--config",
      "dist/server/wrangler.json",
      "--name",
      `pr-${number}`,
      "--json",
      "--ignore-base-config",
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const output = z
    .object({ urls: z.array(z.string().url()) })
    .parse(await previewRequest(number, "GET"));
  const hostname = `pr-${number}-${worker}.chansyawn.workers.dev`;
  const url = output.urls.find((value) => new URL(value).hostname === hostname);
  if (!url) throw new Error("Cloudflare did not return the expected stable Preview URL");
  const resourceBase = requireRemoteResources(resolveResourceConfig("production"));
  await retryPreview(() => verifyPreview(url, resourceBase));
  const latest = await currentPullRequest(number);
  if (latest.state === "closed") {
    await removePreview(number);
    throw new Error("PR closed during deployment");
  }
  if (latest.head.sha !== sha) throw new Error("PR changed during deployment");
  await comment(number, `预览已发布并通过 HTTP 与资源校验。\n\n[打开预览](${url})\n\n提交 ${sha}`);
  console.log(`Verified Preview: ${url}`);
}

if (import.meta.main) {
  const number = z.coerce.number().int().positive().parse(environment("PR_NUMBER"));
  const mode = z.enum(["deploy", "cleanup"]).parse(process.argv[2]);
  const sha = environment("PR_HEAD_SHA");
  try {
    if (mode === "deploy") await deploy(number, sha);
    if (mode === "cleanup" && (await currentPullRequest(number)).state === "closed") {
      await removePreview(number);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
