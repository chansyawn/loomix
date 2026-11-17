import path from "node:path";
import type { Release } from "@loomix/schema/release";
import { configuredStore } from "@loomix/resource-publisher/configuration";
import { PublicationError, publishValidatedContent } from "@loomix/resource-publisher/publish";
import type { ReleaseStore, UploadProgress } from "@loomix/resource-publisher/publish";
import { downloadRelease } from "@loomix/resource-publisher/release";
import { createReleaseId } from "@loomix/resource-publisher/release-id";
import { validateContent } from "@loomix/resource-publisher/validate";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { withResourcePointer } from "./resource-pointer.ts";

export interface PublicationDependencies {
  createStore: () => ReleaseStore;
  check: (release: Release) => Promise<void>;
  request: typeof fetch;
  now: () => Date;
  onProgress?: (progress: UploadProgress) => void;
  warn?: (message: string) => void;
}

const defaults: PublicationDependencies = {
  createStore: configuredStore,
  check: (release) => runReleaseChecks(release, releaseChecks),
  request: (...args) => fetch(...args),
  now: () => new Date(),
};

function resourceUrl(release: string): string {
  return `https://assets.loomix.fun/releases/${release}/`;
}

export async function publishWebsiteResources(
  root: string,
  dryRun = false,
  dependencies: PublicationDependencies = defaults,
) {
  const prepare = async () => {
    // 发布输入固定为当前工作树的本地交付，不受网站环境覆盖值影响。
    const content = await validateContent(path.join(root, "resources/website"));
    await dependencies.check(content.release);
    return content;
  };
  if (dryRun) {
    const content = await prepare();
    return {
      release: createReleaseId(content.release.manifest, 1, dependencies.now()),
      manifestSha256: content.manifestSha256,
      assetCount: content.assets.length,
      documentCount: content.documents.length,
      dryRun: true,
      reserved: false,
      pointerUpdated: false,
    } as const;
  }
  return withResourcePointer(
    root,
    async (pointer) => {
      const content = await prepare();
      const store = dependencies.createStore();
      const marker = await publishValidatedContent(
        content,
        store,
        dependencies.onProgress,
        dependencies.now(),
      ).catch((cause: unknown) => {
        if (cause instanceof PublicationError)
          throw new Error(
            `${cause.message}\n资源地址：${resourceUrl(cause.release)}\n资源指针未更新。`,
            {
              cause,
            },
          );
        throw cause;
      });
      const resourceBaseUrl = resourceUrl(marker.release);
      try {
        const remote = await downloadRelease(
          resourceBaseUrl,
          dependencies.request,
          "https://loomix.fun",
          marker,
        );
        await dependencies.check(remote);
        await pointer.commit(resourceBaseUrl);
      } catch (cause) {
        throw new Error(
          `资源已上传，但本次未更新指针：${resourceBaseUrl}\nmanifestSha256=${marker.manifestSha256}\n${cause instanceof Error ? cause.message : String(cause)}\n修复后可校验此已有版本，再通过 PR 更新指针，无需重新上传：\nVITE_RESOURCE_BASE_URL=${resourceBaseUrl} vp run website#verify-release`,
          { cause },
        );
      }
      return { ...marker, resourceBaseUrl, dryRun: false, pointerUpdated: true } as const;
    },
    dependencies.warn,
  );
}

export function publicationDependencies(
  onProgress: (progress: UploadProgress) => void,
): PublicationDependencies {
  return { ...defaults, onProgress };
}
