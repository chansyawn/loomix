import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

interface ResourcePointer {
  commit(resourceBaseUrl: string): Promise<void>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function withResourcePointer<T>(
  root: string,
  action: (pointer: ResourcePointer) => Promise<T>,
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
  const pointer = path.join(root, "apps/website/release.json");
  const temporary = path.join(path.dirname(pointer), `.release-${randomUUID()}.tmp`);
  let committed = false;
  try {
    await owner.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    const original = await readFile(pointer);
    return await action({
      async commit(resourceBaseUrl) {
        if (committed) throw new Error("资源指针已经提交");
        const file = await open(temporary, "wx");
        try {
          await file.writeFile(JSON.stringify({ resourceBaseUrl }, null, 2) + "\n");
        } finally {
          await file.close();
        }
        // 此检查检测已发生的编辑；锁仅约束发布命令，不能锁住外部编辑器。
        if (!(await readFile(pointer)).equals(original))
          throw new Error("发布期间资源指针已变化，拒绝覆盖；请先检查当前改动。");
        await rename(temporary, pointer);
        committed = true;
      },
    });
  } finally {
    // rename 是提交点；清理失败不能把已经提交的指针误报为未更新。
    for (const clean of [
      () => owner.close(),
      () => rm(temporary, { force: true }),
      () => rm(lock),
    ]) {
      try {
        await clean();
      } catch (error) {
        warn(`发布清理失败（指针${committed ? "已更新" : "未更新"}）：${message(error)}`);
      }
    }
  }
}
