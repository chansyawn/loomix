import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOptions, steps, profile } from "./config.mjs";
import { writeJson, readJson, removeWithin } from "./io.mjs";

import { safeOutput } from "./output.mjs";
import { validate } from "./validate.mjs";

export { safeOutput };

export async function publish(options, validateStaging = validate) {
  safeOutput(options.output);
  const staging = path.join(options.work, "staging");
  const result = readJson(path.join(options.work, "validation.json"));
  if (!result.passed) throw new Error("Validation has not passed");
  // 即使稍后单独使用 --step publish，也要重新校验暂存文件的实际字节内容。
  await validateStaging(options);
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
        "默认输出：resources/website/\n" +
        "输出仅含 content.json 和 assets/；日志和核对报告位于 resources/temp/extraction/content/。",
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
  // 重建任何输入或产物前，先使旧的验证结果失效。
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
