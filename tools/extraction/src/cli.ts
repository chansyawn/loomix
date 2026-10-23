import { parseArgs } from "node:util";
import { init } from "./environment/build.ts";
import { extract } from "./extraction/build.ts";
import { postprocess } from "./stages/postprocess/index.ts";
import { verify } from "./stages/verify/index.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const command = args.shift();
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
      environment: { type: "string" },
      extraction: { type: "string" },
      delivery: { type: "string" },
    },
  });
  if (values.help) {
    console.log(
      "客户端提取：init | extract --environment ID | postprocess --extraction ID | verify --delivery ID\n默认交付：resources/website/；所有路径相对仓库，内部 checkpoint 自动恢复。",
    );
    return;
  }
  if (command === "init") console.log(`environment-id: ${await init()}`);
  else if (command === "extract" && values.environment)
    console.log(`extraction-id: ${await extract(values.environment)}`);
  else if (command === "postprocess" && values.extraction)
    console.log(`delivery-id: ${await postprocess(values.extraction)}`);
  else if (command === "verify" && values.delivery) await verify(values.delivery);
  else
    throw new Error(
      "Use init, extract --environment ID, postprocess --extraction ID, or verify --delivery ID; --help for usage",
    );
}

main().catch((error: Error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
