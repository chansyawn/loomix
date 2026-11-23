import path from "node:path";
import { parseArgs, type ParseArgsOptionDescriptor } from "node:util";
import { init } from "./environment/build.ts";
import { extract } from "./extraction/build.ts";
import { buildResourcePackage } from "./resource-package/build.ts";
import { installLocalResources } from "./resource-package/install.ts";
import { verifyResourcePackage } from "./verify.ts";
import { errorDetails } from "./workflow/errors.ts";
import { assertIdentity, repoRoot } from "./paths.ts";
import { importClient } from "./client/snapshot.ts";
import { profile } from "./profile.ts";
import { resolveStage, type StageLocation } from "./workflow/manifest.ts";

const usage = `客户端提取
  client import --source PATH
  init [--snapshot ID]
  extract --environment ID|NAME
  package --extraction ID|NAME
  refresh [--snapshot ID]
  verify --resource-package ID|NAME
  install-resources --resource-package ID|NAME

ID 为完整 SHA-256，NAME 为准确的产物目录名。
LOOMIX_DATA_ROOT 必须指向共享数据目录。package 生成网站资源包，install-resources 将已验证的资源包安装到当前工作区的 resources/website/。`;

const commands = {
  client: null,
  "client import": "source",
  init: "snapshot",
  extract: "environment",
  package: "extraction",
  refresh: "snapshot",
  verify: "resource-package",
  "install-resources": "resource-package",
} as const;

function isCommand(command: string): command is keyof typeof commands {
  return Object.hasOwn(commands, command);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let command = args[0]?.startsWith("-") ? undefined : args.shift();
  if (args[0] === "--") args.shift();
  if (command === "client" && args[0] && !args[0].startsWith("-"))
    command = `client ${args.shift()}`;
  if (command !== undefined && !isCommand(command))
    throw new Error(`Unknown command: ${command}; use --help`);
  const option = command === undefined ? null : commands[command];
  const options: Record<string, ParseArgsOptionDescriptor> = {
    help: { type: "boolean", short: "h" },
  };
  if (option) options[option] = { type: "string" };
  const { values, tokens } = parseArgs({
    args,
    tokens: true,
    options,
  });
  const seen = new Set<string>();
  let argument: string | undefined;
  for (const token of tokens) {
    if (token.kind !== "option") throw new Error(`Unexpected argument: ${args[token.index]}`);
    if (seen.has(token.name)) throw new Error(`Repeated option: --${token.name}`);
    seen.add(token.name);
    if (token.name === option) argument = token.value;
  }
  if (option === "source" && argument === "") throw new Error("Empty --source path");
  if (values.help) {
    console.log(usage);
    return;
  }
  if (option === "source" && argument === undefined)
    throw new Error("Missing --source path; use --help");
  if (option && option !== "source" && option !== "snapshot" && argument === undefined)
    throw new Error(`Missing --${option} ID; use --help`);
  if (argument !== undefined && option === "snapshot") assertIdentity(argument, option);

  switch (command) {
    case "client import": {
      const snapshot = await importClient(
        path.resolve(repoRoot, requireArgument(argument)),
        profile.paths,
      );
      console.log(
        `client-snapshot-id: ${snapshot.id}\nclient-snapshot-directory: ${snapshot.directory}`,
      );
      break;
    }
    case "init":
      printStage("environment", await init(argument));
      break;
    case "extract":
      printStage("extraction", await extract(requireArgument(argument)));
      break;
    case "package":
      printStage("resource-package", await buildResourcePackage(requireArgument(argument)));
      break;
    case "refresh": {
      const environment = await init(argument);
      const extraction = await extract(environment.id);
      const resourcePackage = await buildResourcePackage(extraction.id);
      printStage("environment", environment);
      printStage("extraction", extraction);
      printStage("resource-package", resourcePackage);
      break;
    }
    case "verify": {
      const resourcePackage = resolveStage("resource-package", requireArgument(argument));
      await verifyResourcePackage(resourcePackage);
      printStage("verified-resource-package", resourcePackage);
      break;
    }
    case "install-resources":
      printStage(
        "installed-resource-package",
        await installLocalResources(requireArgument(argument)),
      );
      break;
    default:
      throw new Error("Missing command; use --help");
  }
}

function printStage(label: string, { id, directory }: StageLocation): void {
  console.log(`${label}-id: ${id}\n${label}-directory: ${directory}`);
}

function requireArgument(value: unknown): string {
  if (typeof value !== "string") throw new Error("Missing command argument; use --help");
  return value;
}

main().catch((error: Error) => {
  console.error(errorDetails(error));
  process.exitCode = 1;
});
