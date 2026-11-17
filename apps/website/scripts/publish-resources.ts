import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createUploadProgress } from "@loomix/resource-publisher/progress";
import { publicationDependencies, publishWebsiteResources } from "./resource-publication.ts";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: vp run resources:publish [--dry-run]\n校验 resources/website、发布到 loomix-assets，远程校验通过后更新本地网站资源指针。\n--dry-run 不联网、不需要凭证、不修改指针；候选 ID 未预留，正式发布时可能不同。\n发布期间不要修改本地资源或网站资源指针；提交与部署继续通过 PR 完成。",
    );
    return;
  }
  const progress = createUploadProgress();
  try {
    const result = await publishWebsiteResources(
      fileURLToPath(new URL("../../../", import.meta.url)),
      values["dry-run"],
      publicationDependencies(progress.update),
    );
    console.log(JSON.stringify(result));
  } catch (error) {
    progress.fail();
    throw error;
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
