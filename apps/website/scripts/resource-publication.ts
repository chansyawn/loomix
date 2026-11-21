import path from "node:path";
import type { Release } from "@loomix/schema/release";
import { validateContent } from "@loomix/resources/delivery";
import {
  describePublication,
  downloadRelease,
  PublicationError,
  publishRelease,
  type UploadProgress,
} from "@loomix/resources/release";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { defaultDeliveryPath } from "./resource-config.ts";
import { withResourcePointer } from "./resource-pointer.ts";

export interface PublicationDependencies {
  publish: typeof publishRelease;
  check: (release: Release) => Promise<void>;
  request: typeof fetch;
  now: () => Date;
  onProgress?: (progress: UploadProgress) => void;
  warn?: (message: string) => void;
}

const defaults: PublicationDependencies = {
  publish: publishRelease,
  check: (release) => runReleaseChecks(release, releaseChecks, console.error),
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
    const content = await validateContent(path.join(root, defaultDeliveryPath));
    await dependencies.check(content.release);
    return content;
  };
  if (dryRun) {
    const content = await prepare();
    return {
      ...describePublication(content, dependencies.now()),
      pointerUpdated: false,
    } as const;
  }
  return withResourcePointer(
    root,
    async (pointer) => {
      const content = await prepare();
      const marker = await dependencies
        .publish(content, { onProgress: dependencies.onProgress, now: dependencies.now() })
        .catch((cause: unknown) => {
          if (cause instanceof PublicationError)
            throw new Error(
              `${cause.message}\n资源地址：${resourceUrl(cause.release)}\n资源指针未更新。`,
              { cause },
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
          `资源已上传，但本次未更新指针：${resourceBaseUrl}\nmanifestSha256=${marker.manifestSha256}\n${cause instanceof Error ? cause.message : String(cause)}\n修复后可校验此已有版本，再通过 PR 更新指针，无需重新上传：\nvp run resources verify --url ${resourceBaseUrl}`,
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
