import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { parseReleaseBase } from "@loomix/resources/release";
import { z } from "zod";

const schema = z.strictObject({ resourceBaseUrl: z.string() });

export function resourceAddressConfigPath(websiteRoot: string): string {
  return path.join(websiteRoot, "resource-address.json");
}

export function parseResourceAddressConfig(input: unknown): { resourceBaseUrl: string } {
  const { resourceBaseUrl } = schema.parse(input);
  return { resourceBaseUrl: parseReleaseBase(resourceBaseUrl).href };
}

interface ResourceAddressConfigUpdate {
  commit(resourceBaseUrl: string): Promise<void>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function withResourceAddressConfig<T>(
  root: string,
  action: (address: ResourceAddressConfigUpdate) => Promise<T>,
  warn: (message: string) => void = console.warn,
): Promise<T> {
  const lock = path.join(root, "var/scratch/resources-publish.lock");
  await mkdir(path.dirname(lock), { recursive: true });
  const owner = await open(lock, "wx").catch((cause: unknown) => {
    if (cause instanceof Error && "code" in cause && cause.code === "EEXIST")
      throw new Error(`已有资源发布锁：${lock}；确认原发布进程已结束后，才能删除遗留锁。`, {
        cause,
      });
    throw cause;
  });
  const address = resourceAddressConfigPath(path.join(root, "apps/website"));
  const temporary = path.join(path.dirname(address), `.resource-address-${randomUUID()}.tmp`);
  let committed = false;
  try {
    await owner.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    const original = await readFile(address);
    parseResourceAddressConfig(JSON.parse(original.toString("utf8")));
    return await action({
      async commit(resourceBaseUrl) {
        if (committed) throw new Error("网站资源地址配置已经提交");
        const config = parseResourceAddressConfig({ resourceBaseUrl });
        const file = await open(temporary, "wx");
        try {
          await file.writeFile(JSON.stringify(config, null, 2) + "\n");
        } finally {
          await file.close();
        }
        // 此检查检测已发生的编辑；锁仅约束发布命令，不能锁住外部编辑器。
        if (!(await readFile(address)).equals(original))
          throw new Error("发布期间网站资源地址配置已变化，拒绝覆盖。请先检查当前改动。");
        await rename(temporary, address);
        committed = true;
      },
    });
  } finally {
    // rename 是提交点；清理失败不能把已经提交的配置误报为未更新。
    for (const clean of [
      () => owner.close(),
      () => rm(temporary, { force: true }),
      () => rm(lock),
    ]) {
      try {
        await clean();
      } catch (error) {
        warn(
          `发布清理失败（网站资源地址配置${committed ? "已更新" : "未更新"}）：${message(error)}`,
        );
      }
    }
  }
}
