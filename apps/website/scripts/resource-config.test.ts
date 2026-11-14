import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

let repository: string;
let website: string;
const releaseUrl = "https://assets.loomix.fun/releases/test-r1/";

beforeEach(() => {
  vi.stubEnv("VITE_RESOURCE_BASE_URL", undefined);
  repository = mkdtempSync(path.join(os.tmpdir(), "loomix-resource-config-"));
  website = path.join(repository, "apps/website");
  mkdirSync(website, { recursive: true });
  writeFileSync(
    path.join(website, "release.json"),
    JSON.stringify({ resourceBaseUrl: releaseUrl }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(repository, { recursive: true, force: true });
});

test("仅从仓库根目录加载覆盖值，本地目录仍相对于仓库解析", () => {
  writeFileSync(path.join(repository, ".env"), "VITE_RESOURCE_BASE_URL=resources/custom/\n");
  writeFileSync(path.join(website, ".env"), "VITE_RESOURCE_BASE_URL=resources/legacy/\n");
  expect(resolveResourceConfig("development", website)).toEqual({
    source: "local",
    directory: path.join(repository, "resources/custom"),
    resourceBaseUrl: "/resources/",
  });
});

test("根目录模式配置覆盖通用配置，进程变量优先于所有文件", () => {
  for (const [file, value] of [
    [".env", "resources/base"],
    [".env.local", "resources/local"],
    [".env.production", "resources/production"],
    [".env.production.local", releaseUrl],
  ] as const) {
    writeFileSync(path.join(repository, file), `VITE_RESOURCE_BASE_URL=${value}\n`);
    expect(resolveResourceConfig("production", website)).toMatchObject(
      value === releaseUrl
        ? { source: "remote", resourceBaseUrl: releaseUrl }
        : { source: "local", directory: path.join(repository, value) },
    );
  }
  vi.stubEnv("VITE_RESOURCE_BASE_URL", "resources/process");
  expect(resolveResourceConfig("production", website)).toMatchObject({
    source: "local",
    directory: path.join(repository, "resources/process"),
  });
});

test("缺少覆盖值时，开发和测试使用本地资源，生产读取网站发布文件", () => {
  writeFileSync(path.join(repository, ".env"), "LOOMIX_PRIVATE_MARKER=server-only\n");
  writeFileSync(path.join(repository, "release.json"), "{}");
  writeFileSync(path.join(website, ".env"), "VITE_RESOURCE_BASE_URL=resources/legacy/\n");
  for (const mode of ["development", "test"]) {
    expect(resolveResourceConfig(mode, website)).toEqual({
      source: "local",
      directory: path.join(repository, "resources/website"),
      resourceBaseUrl: "/resources/",
    });
  }
  expect(resolveResourceConfig("production", website)).toEqual({
    source: "remote",
    resourceBaseUrl: releaseUrl,
  });
});

test.each(["", "/tmp/resources", "C:\\resources", "http://assets.loomix.fun/", " resources/ "])(
  "拒绝无效资源覆盖值：%j",
  (value) => {
    vi.stubEnv("VITE_RESOURCE_BASE_URL", value);
    expect(() => resolveResourceConfig("production", website)).toThrow("Resource base must be");
  },
);

test("部署只接受已发布的 HTTPS 资源版本", () => {
  expect(() => requireRemoteResources(resolveResourceConfig("development", website))).toThrow(
    "Deployment requires",
  );
  expect(requireRemoteResources(resolveResourceConfig("production", website))).toBe(releaseUrl);
});
