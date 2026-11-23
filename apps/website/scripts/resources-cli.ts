import path from "node:path";
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { ReleaseIdSchema } from "@loomix/schema/release";
import { validateWebsiteResources } from "@loomix/resources/website-resources";
import { listResourceReleases, runResourceCleanup } from "@loomix/resources/maintenance";
import {
  defaultBucket,
  describePublication,
  parseReleaseBase,
  publishRelease,
  withUploadProgress,
} from "@loomix/resources/release";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { defaultLocalResourcesPath, repoRoot } from "./resource-config.ts";
import { publicationDependencies, publishWebsiteResources } from "./resource-publication.ts";
import { verifyWebsiteRelease } from "./verify-release.ts";

const usage = `资源命令：
  vp run resources publish [--dry-run]
  vp run resources verify [--local | --url <地址>]
  vp run resources list [--bucket <桶>]
  vp run resources gc [--bucket <桶>] [--release <发布 ID>]... [--apply <计划 ID>]
  vp run resources upload [--content <目录>] [--bucket <桶>] [--dry-run]

发布和上传的 --dry-run 离线校验网站资源，返回未占号的候选 ID。
gc 默认预演。准备执行前，确认指定版本已退出使用。
upload 校验和上传网站资源。publish 还执行网站检查并更新网站资源地址配置。`;

function parseOptions<Options extends ParseArgsOptionsConfig>(args: string[], options: Options) {
  const { values } = parseArgs({
    args,
    options: { ...options, help: { type: "boolean" } } as const,
  });
  if ("help" in values && values.help) {
    console.log(usage);
    return;
  }
  return values;
}

function printResult(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function main([command, ...args]: string[]): Promise<void> {
  switch (command) {
    case undefined:
    case "--help":
      if (args.length) throw new Error(usage);
      console.log(usage);
      return;
    case "publish": {
      const values = parseOptions(args, { "dry-run": { type: "boolean" } } as const);
      if (!values) return;
      const result = values["dry-run"]
        ? await publishWebsiteResources(repoRoot, true)
        : await withUploadProgress((progress) =>
            publishWebsiteResources(repoRoot, false, publicationDependencies(progress)),
          );
      printResult(result);
      return;
    }
    case "verify": {
      const values = parseOptions(args, {
        local: { type: "boolean" },
        url: { type: "string" },
      } as const);
      if (!values) return;
      if (values.local && values.url !== undefined) throw new Error("--local 和 --url 互斥");
      if (values.local) {
        const directory = path.join(repoRoot, defaultLocalResourcesPath);
        const content = await validateWebsiteResources(directory);
        await runReleaseChecks(content.websiteResources, releaseChecks, console.error);
        printResult({ source: "local", directory, manifestSha256: content.manifestSha256 });
      } else {
        const url = values.url === undefined ? undefined : parseReleaseBase(values.url).href;
        const resourceBaseUrl = await verifyWebsiteRelease(url, console.error);
        printResult({ source: "remote", resourceBaseUrl });
      }
      return;
    }
    case "list": {
      const values = parseOptions(args, { bucket: { type: "string" } } as const);
      if (values) printResult(await listResourceReleases(values.bucket));
      return;
    }
    case "gc": {
      const values = parseOptions(args, {
        bucket: { type: "string" },
        release: { type: "string", multiple: true },
        apply: { type: "string" },
      } as const);
      if (!values) return;
      const releaseIds = (values.release ?? []).map((release) => ReleaseIdSchema.parse(release));
      await runResourceCleanup(
        { bucket: values.bucket, releaseIds, applyPlanId: values.apply },
        printResult,
      );
      return;
    }
    case "upload": {
      const values = parseOptions(args, {
        content: { type: "string" },
        bucket: { type: "string" },
        "dry-run": { type: "boolean" },
      } as const);
      if (!values) return;
      const content = await validateWebsiteResources(
        path.resolve(repoRoot, values.content ?? defaultLocalResourcesPath),
      );
      if (values["dry-run"]) {
        printResult(describePublication(content));
      } else {
        const bucket = values.bucket ?? defaultBucket;
        const marker = await withUploadProgress((onProgress) =>
          publishRelease(content, { bucket, onProgress }),
        );
        const { release: releaseId, ...details } = marker;
        printResult({ bucket, releaseId, ...details });
      }
      return;
    }
    default:
      throw new Error(`未知资源命令：${command}\n${usage}`);
  }
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
