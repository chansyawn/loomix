import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getOptions, profile } from "./config.mjs";

const steps = [
  "select-config-source",
  "inspect-resources",
  "probe-tables",
  "decode-textmap",
  "scan-decoded-tables",
  "decode-cs-index",
  "build-resolved-catalog",
  "export-catalog-icons",
  "audit-icon-sources",
  "build-database",
  "validate-catalog",
];

async function main() {
  const options = getOptions();
  if (options.help) {
    console.log(
      `物品提取（${profile.gameVersion}, revision ${profile.dataRevision}）\n\nnode run.mjs [--step NAME] [--output DIR] [--baseline JSON]\n\n默认执行全部步骤；--step 仅执行指定步骤，不补跑依赖。\n路径为绝对路径或仓库相对路径。\n默认输出：${profile.paths.output}\n无 baseline 时跳过版本对比。\n\n步骤：\n${steps.join("\n")}`,
    );
    return;
  }
  if (options.step && !steps.includes(options.step))
    throw new Error(`Unknown step: ${options.step}`);
  if (options.baseline) {
    const baseline = JSON.parse(fs.readFileSync(options.baseline));
    if (!Array.isArray(baseline.items)) throw new Error("Baseline must contain an items array");
  }
  const selected = options.step ? [options.step] : steps;
  fs.mkdirSync(path.join(options.output, "logs"), { recursive: true });
  const report = {
    gameVersion: profile.gameVersion,
    dataRevision: profile.dataRevision,
    output: options.output,
    baseline: options.baseline,
    versionComparison: options.baseline ? "requested" : "skipped_no_baseline",
    startedAt: new Date().toISOString(),
    steps: [],
    status: "running",
  };
  const save = () =>
    fs.writeFileSync(path.join(options.output, "run-report.json"), JSON.stringify(report, null, 2));
  save();
  try {
    for (const step of selected) {
      console.log(`[${step}] starting`);
      const logFile = path.join(options.output, "logs", `${step}.log`);
      const fd = fs.openSync(logFile, "w");
      const args = [
        fileURLToPath(new URL(`./${step}.mjs`, import.meta.url)),
        "--output",
        options.output,
      ];
      if (options.baseline) args.push("--baseline", options.baseline);
      const record = { name: step, logFile, startedAt: new Date().toISOString() };
      report.steps.push(record);
      let code;
      try {
        code = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, args, {
            windowsHide: true,
            stdio: ["ignore", fd, fd],
          });
          child.once("error", reject);
          child.once("exit", (exitCode, signal) => resolve(exitCode ?? `signal:${signal}`));
        });
      } finally {
        fs.closeSync(fd);
      }
      record.exitCode = code;
      record.finishedAt = new Date().toISOString();
      save();
      if (code !== 0) throw new Error(`${step} failed (${code}); see ${logFile}`);
      console.log(`[${step}] passed`);
    }
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.error = error.message;
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    save();
  }
  console.log(`Output: ${options.output}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
