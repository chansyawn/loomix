import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { withResourcePointer } from "./resource-pointer.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "loomix-pointer-"));
  roots.push(root);
  const pointer = path.join(root, "apps/website/release.json");
  const lock = path.join(root, "var/scratch/resources-publish.lock");
  await mkdir(path.dirname(pointer), { recursive: true });
  await writeFile(pointer, "original\n");
  return { root, pointer, lock };
}

test("同一工作树内发布互斥，不删除其他进程持有的锁", async () => {
  const { root, lock } = await fixture();
  const action = vi.fn();
  await withResourcePointer(root, async () => {
    const owner = await readFile(lock, "utf8");
    expect(JSON.parse(owner).pid).toBe(process.pid);
    await expect(withResourcePointer(root, action)).rejects.toThrow(lock);
    expect(action).not.toHaveBeenCalled();
    expect(await readFile(lock, "utf8")).toBe(owner);
  });
  await expect(access(lock)).rejects.toThrow();
});

test("遇到遗留锁明确提示人工恢复，不自动抢锁", async () => {
  const { root, lock } = await fixture();
  await mkdir(path.dirname(lock), { recursive: true });
  await writeFile(lock, "stale");
  await expect(withResourcePointer(root, async () => {})).rejects.toThrow("确认原发布进程已结束");
  expect(await readFile(lock, "utf8")).toBe("stale");
});

test("提交前出错保留原指针并清理锁", async () => {
  const { root, pointer, lock } = await fixture();
  await expect(
    withResourcePointer(root, async () => {
      throw new Error("失败");
    }),
  ).rejects.toThrow("失败");
  expect(await readFile(pointer, "utf8")).toBe("original\n");
  await expect(access(lock)).rejects.toThrow();
  expect(await readdir(path.dirname(pointer))).toEqual(["release.json"]);
});

test("原子替换成功后清理出错只报告警告，不误报指针未更新", async () => {
  const { root, pointer, lock } = await fixture();
  const warn = vi.fn();
  const result = await withResourcePointer(
    root,
    async (session) => {
      await session.commit("https://assets.loomix.fun/releases/new/");
      await rm(lock);
      await mkdir(lock);
      return "committed";
    },
    warn,
  );
  expect(result).toBe("committed");
  expect(JSON.parse(await readFile(pointer, "utf8"))).toEqual({
    resourceBaseUrl: "https://assets.loomix.fun/releases/new/",
  });
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("指针已更新"));
  expect(await readdir(path.dirname(pointer))).toEqual(["release.json"]);
});
