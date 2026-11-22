import path from "node:path";
import {
  assembleWebsiteResources,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceManifestSchema,
  type WebsiteResourceDocumentType,
  type WebsiteResourceManifest,
  type WebsiteResources,
} from "@loomix/schema/website-resources";
import { isMissingFile, readRegularFile } from "./files.ts";
import { sha256 } from "./release.ts";

// 只校验清单声明的文档，不读取图片字节；完整目录校验由 validateWebsiteResources 负责。
export async function loadWebsiteResources(directory: string): Promise<WebsiteResources> {
  const manifestPath = path.join(directory, WEBSITE_RESOURCE_MANIFEST_FILE);
  let manifestBytes: Buffer;
  try {
    manifestBytes = await readRegularFile(manifestPath);
  } catch (cause) {
    if (isMissingFile(cause))
      throw new Error(`未找到本地网站资源清单：${manifestPath}。请先安装本地资源。`, {
        cause,
      });
    throw cause;
  }

  let manifest: WebsiteResourceManifest;
  try {
    manifest = WebsiteResourceManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
  } catch (cause) {
    throw new Error(`本地网站资源清单不符合当前契约：${manifestPath}。请重新安装本地资源。`, {
      cause,
    });
  }

  const documents = new Map<WebsiteResourceDocumentType, unknown>();
  for (const file of manifest.files) {
    let bytes: Buffer;
    try {
      bytes = await readRegularFile(path.join(directory, file.path));
    } catch (cause) {
      if (isMissingFile(cause))
        throw new Error(`本地网站资源缺少文档：${file.path}。请重新安装本地资源。`, { cause });
      throw cause;
    }
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
      throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
    try {
      documents.set(file.kind, JSON.parse(bytes.toString("utf8")));
    } catch (cause) {
      throw new Error(`本地网站资源文档不是合法 JSON：${file.path}。请重新安装本地资源。`, {
        cause,
      });
    }
  }

  try {
    return assembleWebsiteResources(manifest, documents);
  } catch (cause) {
    throw new Error(`本地网站资源不符合当前契约：${directory}。请重新安装本地资源。`, {
      cause,
    });
  }
}
