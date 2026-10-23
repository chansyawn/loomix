import type { ToolOptions, AnimeStudio, ExtractionOptions } from "./types.ts";
import type { ProcessOptions } from "../../workflow/process.ts";
import { errorCode, errorMessage } from "../../workflow/errors.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { cacheRoot, patchFile, repoRoot, runtimeIdentifier, version } from "./config.ts";
import { preparePlatform } from "./platforms.ts";
import { runProcess } from "../../workflow/process.ts";
import { withLock } from "../../workflow/lock.ts";
import { inventory, filesWithin, digest } from "../../workflow/hashing.ts";
import { verifyFiles, atomicJson } from "../../workflow/manifest.ts";
import { z } from "zod";
import { inspectAssetMap } from "./asset-map.ts";

// 平台准备与进程执行的替换点仅供模块测试使用，任务通过 index.ts 调用。
export function createAnimeStudio({
  root = cacheRoot,
  platform = process.platform,
  architecture = process.arch,
  prepare = preparePlatform,
  run = runProcess,
  patch = fs.readFileSync(patchFile),
}: ToolOptions = {}): AnimeStudio {
  let pending: Promise<{ executable: string; env: NodeJS.ProcessEnv }> | undefined;
  async function initialize() {
    const rid = runtimeIdentifier(platform, architecture);
    const identity = {
      version,
      rid,
      patch: platform === "darwin" ? crypto.createHash("sha256").update(patch).digest("hex") : null,
    };
    const key = crypto
      .createHash("sha256")
      .update(JSON.stringify(identity))
      .digest("hex")
      .slice(0, 20);
    const directory = path.join(root, rid, key);
    const work = `${directory}.work`;
    const staging = `${directory}.staging`;
    const logFile = path.join(root, "logs", `${rid}-${key}.log`);
    const contextAt = (base: string) => ({
      executable: path.join(
        base,
        "cli",
        platform === "win32" ? "AnimeStudio.CLI.exe" : "AnimeStudio.CLI",
      ),
      env:
        platform === "win32"
          ? {
              DOTNET_ROOT: path.join(base, "runtime"),
              DOTNET_ROOT_X64: path.join(base, "runtime"),
              DOTNET_MULTILEVEL_LOOKUP: "0",
            }
          : {},
    });
    const probe = (base: string) => {
      const context = contextAt(base);
      return run(context.executable, ["--version"], { env: context.env, logFile });
    };
    return withLock(`${directory}.lock`, async () => {
      try {
        const marker = z
          .object({
            key: z.string(),
            outputs: z
              .array(z.object({ path: z.string(), sha256: z.string(), bytes: z.number() }))
              .nonempty(),
          })
          .parse(JSON.parse(fs.readFileSync(path.join(directory, "ready.json"), "utf8")));
        if (marker.key !== key) throw new Error("Tool identity mismatch");
        await verifyFiles(directory, marker.outputs);
        const actualFiles = filesWithin(directory).filter((file) => file !== "ready.json");
        if (
          JSON.stringify(actualFiles.sort()) !==
          JSON.stringify(marker.outputs.map((file) => file.path).sort())
        )
          throw new Error("Tool output inventory changed");
        await probe(directory);
        return contextAt(directory);
      } catch (error) {
        if (errorCode(error) !== "ENOENT")
          console.log(`AnimeStudio cache needs preparation; see ${logFile}`);
      }
      console.log(`Preparing AnimeStudio ${rid}; see ${logFile}`);
      fs.rmSync(staging, { recursive: true, force: true });
      fs.mkdirSync(staging, { recursive: true });
      fs.mkdirSync(work, { recursive: true });
      // 每次重试重新检出源码，局部 SDK 可复用，避免重用未完成的构建。
      fs.rmSync(path.join(work, "source"), { recursive: true, force: true });
      fs.rmSync(path.join(work, "unpacked"), { recursive: true, force: true });
      const loggedRun = (executable: string, args: string[], options?: ProcessOptions) =>
        run(executable, args, { ...options, logFile });
      try {
        await prepare({ directory: staging, work, rid, platform, run: loggedRun });
        await probe(staging);
        atomicJson(path.join(staging, "ready.json"), {
          schemaVersion: 1,
          key,
          ...identity,
          outputs: await inventory(staging),
        });
        const previous = `${directory}.previous`;
        fs.rmSync(previous, { recursive: true, force: true });
        if (fs.existsSync(directory)) fs.renameSync(directory, previous);
        try {
          fs.renameSync(staging, directory);
        } catch (error) {
          if (fs.existsSync(previous)) fs.renameSync(previous, directory);
          throw error;
        }
        fs.rmSync(previous, { recursive: true, force: true });
        return contextAt(directory);
      } catch (cause) {
        throw new Error(
          `AnimeStudio initialization failed; see ${logFile}: ${errorMessage(cause)}`,
          {
            cause,
          },
        );
      }
    });
  }
  function ensure() {
    pending ??= initialize().catch((error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  }
  async function execute({ input, output, game, logFile }: ExtractionOptions, flags: string[]) {
    const source = path.resolve(repoRoot, input);
    const destination = path.resolve(repoRoot, output);
    if (!game) throw new Error("AnimeStudio game is required");
    if (!fs.existsSync(source)) throw new Error(`Missing extraction input: ${source}`);
    const context = await ensure();
    const log = logFile
      ? path.resolve(repoRoot, logFile)
      : path.join(root, "logs", `extract-${crypto.randomUUID()}.log`);
    fs.mkdirSync(path.dirname(log), { recursive: true });
    fs.writeFileSync(log, "");
    await run(context.executable, [source, destination, "--game", game, ...flags], {
      env: context.env,
      logFile: log,
    });
    // Windows 上游有些失败只写日志并返回 0，仍须让调用方得到失败结果。
    for await (const line of readline.createInterface({
      input: fs.createReadStream(log),
      crlfDelay: Infinity,
    })) {
      if (/^(?:\[Error\]|(?:System|AnimeStudio)\.[\w.]*Exception:)/.test(line))
        throw new Error(`AnimeStudio reported an error; see ${log}`);
    }
  }
  return {
    ensureAnimeStudio: async () => {
      const context = await ensure();
      return digest(
        fs.readFileSync(
          path.join(path.dirname(path.dirname(context.executable)), "ready.json"),
          "utf8",
        ),
      );
    },
    exportAssets: async (options) => {
      const { types, names = [], containers = [] } = options;
      if (!Array.isArray(types) || !types.length) throw new Error("Export types are required");
      const flags = ["--types", ...types];
      // 非模型任务无需解析 Shader；当前客户端的 Shader 布局尚未适配。
      if (types.every((type) => ["Texture2D", "Sprite", "MiHoYoBinData"].includes(type)))
        flags.push("Shader:None");
      if (names.length) flags.push("--names", ...names);
      if (containers.length) flags.push("--containers", ...containers);
      await execute(options, flags);
    },
    buildAssetMap: async (options) => {
      const output = path.resolve(repoRoot, options.output);
      fs.mkdirSync(output, { recursive: true });
      const staging = fs.mkdtempSync(path.join(output, ".index-"));
      try {
        await execute({ ...options, output: staging }, [
          "--map_op",
          "AssetMap",
          "--map_type",
          "XML",
        ]);
        const file = path.join(staging, "assets_map.xml");
        await inspectAssetMap(file);
        const destination = path.join(output, "assets_map.xml");
        fs.renameSync(file, destination);
        return destination;
      } finally {
        fs.rmSync(staging, { recursive: true, force: true });
      }
    },
  };
}
