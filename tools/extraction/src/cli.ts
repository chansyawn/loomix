import path from "node:path";
import { parseArgs } from "node:util";
import { init } from "./environment/build.ts";
import { extract } from "./extraction/build.ts";
import { deliver } from "./delivery/build.ts";
import { materialize } from "./delivery/materialize.ts";
import { verify } from "./verify.ts";
import { errorDetails } from "./workflow/errors.ts";
import { repoRoot } from "./paths.ts";
import { importClient, selectClient } from "./client/snapshot.ts";
import { migrateLegacyStorage } from "./storage/migrate.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const command = args[0]?.startsWith("-") ? undefined : args.shift();
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      environment: { type: "string" },
      extraction: { type: "string" },
      delivery: { type: "string" },
      snapshot: { type: "string" },
      source: { type: "string" },
      "artifact-only": { type: "boolean" },
      website: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "客户端提取：client import [--source PATH] | client select --snapshot ID | init | extract --environment ID | deliver --extraction ID [--website] | materialize --delivery ID | refresh | verify --delivery ID\nLOOMIX_DATA_ROOT 必须指向共享数据目录。deliver 默认生成不可变交付；materialize 将已验证版本发布到当前 worktree 的 resources/website/。",
    );
    return;
  }
  if (command === "client" && positionals[0] === "import") {
    const source = path.resolve(repoRoot, values.source ?? "resources/game-client");
    console.log(`client-snapshot-id: ${await importClient(source)}`);
    return;
  } else if (command === "client" && positionals[0] === "select" && values.snapshot) {
    await selectClient(values.snapshot);
    console.log(`selected-client-snapshot-id: ${values.snapshot}`);
    return;
  }
  if (["init", "extract", "deliver", "materialize", "refresh", "verify"].includes(command ?? ""))
    await migrateLegacyStorage();
  if (command === "init") {
    console.log(`environment-id: ${await init()}`);
  } else if (command === "extract" && values.environment)
    console.log(`extraction-id: ${await extract(values.environment)}`);
  else if (command === "refresh") {
    const environmentId = await init();
    const extractionId = await extract(environmentId);
    const deliveryId = await deliver(extractionId, { artifactOnly: true });
    console.log(
      `environment-id: ${environmentId}\nextraction-id: ${extractionId}\ndelivery-id: ${deliveryId}\nRun materialize --delivery ${deliveryId} to update resources/website/`,
    );
  } else if (command === "deliver" && values.extraction)
    console.log(
      `delivery-id: ${await deliver(values.extraction, {
        artifactOnly: !values.website || values["artifact-only"],
      })}`,
    );
  else if (command === "materialize" && values.delivery) {
    await materialize(values.delivery);
    console.log(`materialized-delivery-id: ${values.delivery}`);
  } else if (command === "verify" && values.delivery) await verify(values.delivery);
  else
    throw new Error(
      "Use init, extract --environment ID, deliver --extraction ID, refresh, or verify --delivery ID; --help for usage",
    );
}

main().catch((error: Error) => {
  console.error(errorDetails(error));
  process.exitCode = 1;
});
