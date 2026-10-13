import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOptions, steps, profile, repoRoot } from "./config.mjs";
import { writeJson, readJson, removeWithin } from "./io.mjs";

export function safeOutput(output) {
  const resource = path.resolve(repoRoot, "resources");
  const relative = path.relative(resource, output).toLowerCase().split(path.sep);
  const repoRelative = path.relative(repoRoot, output).toLowerCase().split(path.sep);
  if (
    relative[0] === "petit-planet-game" ||
    relative.includes("index") ||
    output === resource ||
    output === repoRoot ||
    ["apps", "packages", ".git", ".agents", ".codex"].includes(repoRelative[0]) ||
    (relative[0] === "petit-planet-extraction" && relative.length <= 2)
  )
    throw new Error(`Unsafe output directory: ${output}`);
  if (fs.existsSync(output)) {
    if (fs.lstatSync(output).isSymbolicLink()) throw new Error("Output cannot be a link");
    const json = path.join(output, "content.json");
    if (
      fs.existsSync(json) &&
      (!fs.lstatSync(json).isFile() || fs.lstatSync(json).isSymbolicLink())
    )
      throw new Error("Output JSON must be a regular file");
    if (fs.existsSync(path.join(output, "assets"))) {
      const assets = path.join(output, "assets");
      if (!fs.lstatSync(assets).isDirectory() || fs.lstatSync(assets).isSymbolicLink())
        throw new Error("Output assets must be a regular directory");
      for (const name of fs.readdirSync(assets)) {
        const stat = fs.lstatSync(path.join(assets, name));
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("Output assets contain a link or subdirectory");
      }
    }
    const unexpected = fs
      .readdirSync(output)
      .filter((s) => !["content.json", "assets"].includes(s));
    if (unexpected.length)
      throw new Error(`Output contains unrelated files: ${unexpected.join(", ")}`);
  }
}

export async function publish(options) {
  safeOutput(options.output);
  const staging = path.join(options.work, "staging");
  const result = readJson(path.join(options.work, "validation.json"));
  if (!result.passed) throw new Error("Validation has not passed");
  // Revalidate the actual staging bytes, even when --step publish is used later.
  await (await import("./validate.mjs")).validate(options);
  fs.mkdirSync(options.output, { recursive: true });
  const at = (name) => path.join(options.output, name);
  let oldAssets = false,
    oldJson = false,
    newAssets = false,
    newJson = false,
    succeeded = false;
  try {
    fs.cpSync(path.join(staging, "assets"), at(".assets-next"), { recursive: true });
    fs.copyFileSync(path.join(staging, "content.json"), at(".content-next.json"));
    if (fs.existsSync(at("assets"))) {
      fs.renameSync(at("assets"), at(".assets-previous"));
      oldAssets = true;
    }
    if (fs.existsSync(at("content.json"))) {
      fs.renameSync(at("content.json"), at(".content-previous.json"));
      oldJson = true;
    }
    fs.renameSync(at(".assets-next"), at("assets"));
    newAssets = true;
    fs.renameSync(at(".content-next.json"), at("content.json"));
    newJson = true;
    succeeded = true;
  } catch (error) {
    if (newAssets) removeWithin(at("assets"), options.output);
    if (newJson) removeWithin(at("content.json"), options.output);
    if (oldAssets) fs.renameSync(at(".assets-previous"), at("assets"));
    if (oldJson) fs.renameSync(at(".content-previous.json"), at("content.json"));
    throw error;
  } finally {
    for (const name of [
      ".assets-next",
      ".content-next.json",
      ...(succeeded ? [".assets-previous", ".content-previous.json"] : []),
    ])
      removeWithin(at(name), options.output);
  }
}

export async function main(args) {
  const options = getOptions(args);
  if (options.help) {
    console.log(
      `有效内容提取（${profile.gameVersion}, revision ${profile.dataRevision}）\n` +
        `node run.mjs [--step NAME] [--output DIR]\n步骤：${steps.join(", ")}\n` +
        "--step 只执行指定步骤，不补跑依赖。路径相对仓库解析。\n" +
        `默认输出：resources/petit-planet-extraction/${profile.gameVersion}/content/\n` +
        "输出仅含 content.json 和 assets/；日志和核对报告位于 resources/temp/content/。",
    );
    return;
  }
  if (options.step && !steps.includes(options.step))
    throw new Error(`Unknown step: ${options.step}`);
  safeOutput(options.output);
  fs.mkdirSync(options.work, { recursive: true });
  const report = {
    output: options.output,
    work: options.work,
    gameVersion: profile.gameVersion,
    revision: profile.dataRevision,
    startedAt: new Date().toISOString(),
    status: "running",
    steps: [],
  };
  // Invalidate old validation before rebuilding any inputs or output.
  if (!options.step || ["prepare", "structure", "assets", "audit"].includes(options.step)) {
    fs.rmSync(path.join(options.work, "validation.json"), { force: true });
  }
  try {
    for (const name of options.step ? [options.step] : steps) {
      console.log(`[${name}] starting`);
      const record = { name, startedAt: new Date().toISOString() };
      report.steps.push(record);
      writeJson(path.join(options.work, "run-report.json"), report);
      const action = name === "publish" ? publish : (await import(`./${name}.mjs`))[name];
      await action(options);
      record.status = "passed";
      record.finishedAt = new Date().toISOString();
      console.log(`[${name}] passed`);
    }
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.error = error.stack;
    if (report.steps.length) report.steps.at(-1).status = "failed";
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    writeJson(path.join(options.work, "run-report.json"), report);
    console.log(`核对报告与日志：${options.work}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
