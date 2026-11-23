import path from "node:path";
import type { WebsiteResources } from "@loomix/schema/website-resources";
import { validateWebsiteResources } from "@loomix/resources/website-resources";
import {
  describePublication,
  downloadRelease,
  PublicationError,
  publishRelease,
  type UploadProgress,
} from "@loomix/resources/release";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { defaultLocalResourcesPath } from "./resource-config.ts";
import { withResourceAddressConfig } from "./resource-address-config.ts";

export interface PublicationDependencies {
  publish: typeof publishRelease;
  check: (resources: WebsiteResources) => Promise<void>;
  request: typeof fetch;
  now: () => Date;
  onProgress?: (progress: UploadProgress) => void;
  warn?: (message: string) => void;
}

const defaults: PublicationDependencies = {
  publish: publishRelease,
  check: (resources) => runReleaseChecks(resources, releaseChecks, console.error),
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
    // 发布只读取当前工作区安装的网站资源，不受网站环境覆盖值影响。
    const content = await validateWebsiteResources(path.join(root, defaultLocalResourcesPath));
    await dependencies.check(content.websiteResources);
    return content;
  };
  if (dryRun) {
    const content = await prepare();
    return {
      ...describePublication(content, dependencies.now()),
      resourceAddressUpdated: false,
    } as const;
  }
  return withResourceAddressConfig(
    root,
    async (address) => {
      const content = await prepare();
      const marker = await dependencies
        .publish(content, { onProgress: dependencies.onProgress, now: dependencies.now() })
        .catch((cause: unknown) => {
          if (cause instanceof PublicationError)
            throw new Error(
              `${cause.message}\n资源地址：${resourceUrl(cause.release)}\n网站资源地址配置未更新。`,
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
        await address.commit(resourceBaseUrl);
      } catch (cause) {
        throw new Error(
          `资源已上传，网站资源地址配置未更新：${resourceBaseUrl}\nmanifestSha256=${marker.manifestSha256}\n${cause instanceof Error ? cause.message : String(cause)}\n修复后可校验此已有版本，再通过 PR 更新网站资源地址配置：\nvp run resources verify --url ${resourceBaseUrl}`,
          { cause },
        );
      }
      const { release: releaseId, ...details } = marker;
      return {
        releaseId,
        ...details,
        resourceBaseUrl,
        dryRun: false,
        resourceAddressUpdated: true,
      } as const;
    },
    dependencies.warn,
  );
}

export function publicationDependencies(
  onProgress: (progress: UploadProgress) => void,
): PublicationDependencies {
  return { ...defaults, onProgress };
}
