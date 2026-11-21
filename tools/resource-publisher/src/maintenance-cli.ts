import { parseArgs } from "node:util";
import { ReleaseIdSchema } from "@loomix/schema/release";
import { z } from "zod";
import { configuredStore, defaultBucket } from "./configuration.ts";
import { applyCleanup, listReleases, planCleanup } from "./maintenance.ts";
import { sha256 } from "./release.ts";

const usage = `资源维护：
  vp run resources:maintain list
  vp run resources:maintain gc [--release <release-id>]... [--apply <plan-id>]
  --release 可重复指定。省略时仅清理过期的未完成上传和孤儿图片。
  可用 --bucket 指定目标存储桶。`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      bucket: { type: "string", default: defaultBucket },
      release: { type: "string", multiple: true },
      apply: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  const command = z.enum(["list", "gc"]).parse(positionals[0]);
  if (
    positionals.length !== 1 ||
    (command === "list" && (values.release !== undefined || values.apply !== undefined))
  )
    throw new Error(usage);
  const releases = z.array(ReleaseIdSchema).parse(values.release ?? []);
  const store = configuredStore(values.bucket);
  if (command === "list") {
    console.log(JSON.stringify(await listReleases(store), null, 2));
  } else {
    const plan = await planCleanup(store, releases);
    const planId = sha256(Buffer.from(JSON.stringify({ bucket: values.bucket, ...plan })));
    if (values.apply !== undefined && values.apply !== planId)
      throw new Error("清理计划已变化，请重新预演");
    console.log(JSON.stringify({ planId, ...plan }, null, 2));
    if (values.apply !== undefined) await applyCleanup(store, plan);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
