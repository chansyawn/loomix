import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { withResourceAddressConfig } from "./resource-address-config.ts";

const roots: string[] = [];
const original = '{"resourceBaseUrl":"https://assets.loomix.fun/releases/original/"}\n';
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "loomix-resource-address-"));
  roots.push(root);
  const address = path.join(root, "apps/website/resource-address.json");
  const lock = path.join(root, "var/scratch/resources-publish.lock");
  await mkdir(path.dirname(address), { recursive: true });
  await writeFile(address, original);
  return { root, address, lock };
}

test("同一工作树内发布互斥，不删除其他进程持有的锁", async () => {
  const { root, lock } = await fixture();
  const action = vi.fn();
  await withResourceAddressConfig(root, async () => {
    const owner = await readFile(lock, "utf8");
    expect(JSON.parse(owner).pid).toBe(process.pid);
    await expect(withResourceAddressConfig(root, action)).rejects.toThrow(lock);
    expect(action).not.toHaveBeenCalled();
    expect(await readFile(lock, "utf8")).toBe(owner);
  });
  await expect(access(lock)).rejects.toThrow();
});

test("遇到遗留锁明确提示人工恢复，不自动抢锁", async () => {
  const { root, lock } = await fixture();
  await mkdir(path.dirname(lock), { recursive: true });
  await writeFile(lock, "stale");
  await expect(withResourceAddressConfig(root, async () => {})).rejects.toThrow(
    "确认原发布进程已结束",
  );
  expect(await readFile(lock, "utf8")).toBe("stale");
});

test("提交前出错保留原配置并清理锁", async () => {
  const { root, address, lock } = await fixture();
  await expect(
    withResourceAddressConfig(root, async () => {
      throw new Error("失败");
    }),
  ).rejects.toThrow("失败");
  expect(await readFile(address, "utf8")).toBe(original);
  await expect(access(lock)).rejects.toThrow();
  expect(await readdir(path.dirname(address))).toEqual(["resource-address.json"]);
});

test("原子替换成功后清理出错仍报告配置已更新", async () => {
  const { root, address, lock } = await fixture();
  const warn = vi.fn();
  const result = await withResourceAddressConfig(
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
  expect(JSON.parse(await readFile(address, "utf8"))).toEqual({
    resourceBaseUrl: "https://assets.loomix.fun/releases/new/",
  });
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("网站资源地址配置已更新"));
  expect(await readdir(path.dirname(address))).toEqual(["resource-address.json"]);
});

test("拒绝无效原配置并释放发布锁", async () => {
  const { root, address, lock } = await fixture();
  const action = vi.fn();
  await writeFile(address, "{}");
  await expect(withResourceAddressConfig(root, action)).rejects.toThrow();
  expect(action).not.toHaveBeenCalled();
  expect(await readFile(address, "utf8")).toBe("{}");
  await expect(access(lock)).rejects.toThrow();
});
