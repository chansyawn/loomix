import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ReleaseIdSchema } from "@loomix/schema/release";
import { z } from "zod";
import { configuredStore, defaultBucket } from "./configuration.ts";
import { applyCleanup, listReleases, planCleanup, setReleaseRetired } from "./maintenance.ts";
import { sha256 } from "./release.ts";

const usage = `资源维护：
  vp run resources:maintain list
  vp run resources:maintain retire <release-id> --keep-file <path>
  vp run resources:maintain restore <release-id>
  vp run resources:maintain gc --keep-file <path> [--apply <plan-id>]
  可用 --bucket 指定目标存储桶。保护文件为资源发布 ID 的非空 JSON 数组。`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      bucket: { type: "string", default: defaultBucket },
      "keep-file": { type: "string" },
      apply: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  const command = z.enum(["list", "retire", "restore", "gc"]).parse(positionals[0]);
  const release =
    command === "retire" || command === "restore"
      ? ReleaseIdSchema.parse(positionals[1])
      : undefined;
  if (positionals.length !== (release ? 2 : 1) || (command !== "gc" && values.apply !== undefined))
    throw new Error(usage);
  let keep: string[] = [];
  if (command === "retire" || command === "gc") {
    if (!values["keep-file"]) throw new Error("请提供 --keep-file");
    keep = z
      .array(ReleaseIdSchema)
      .min(1)
      .parse(JSON.parse(await readFile(values["keep-file"], "utf8")));
  }
  const store = configuredStore(values.bucket);
  if (command === "list") {
    console.log(JSON.stringify(await listReleases(store), null, 2));
  } else if (release) {
    await setReleaseRetired(store, release, command === "retire", keep);
    console.log(JSON.stringify({ release, retired: command === "retire" }));
  } else {
    const plan = await planCleanup(store, keep);
    const planId = sha256(Buffer.from(JSON.stringify({ bucket: values.bucket, ...plan })));
    if (values.apply !== undefined && values.apply !== planId)
      throw new Error("清理计划已变化，请重新预演");
    console.log(JSON.stringify({ planId, ...plan }, null, 2));
    if (values.apply) await applyCleanup(store, plan);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
