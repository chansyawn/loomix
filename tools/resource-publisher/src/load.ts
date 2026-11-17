import path from "node:path";
import { assembleRelease, parseReleaseManifest } from "@loomix/schema/release";
import type { DocumentKind, Release, ReleaseManifest } from "@loomix/schema/release";
import { readRegularFile } from "./files.ts";
import { sha256 } from "./release.ts";

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

// 只校验清单声明的文档，不读取图片字节；完整目录校验仍由 validateContent 负责。
export async function loadReleaseDirectory(directory: string): Promise<Release> {
  const manifestPath = path.join(directory, "release.json");
  let manifestBytes: Buffer;
  try {
    manifestBytes = await readRegularFile(manifestPath);
  } catch (cause) {
    if (isMissingFile(cause))
      throw new Error(
        `未找到本地 release：${manifestPath}；请先 materialize 到 resources/website。`,
        {
          cause,
        },
      );
    throw cause;
  }

  let manifest: ReleaseManifest;
  try {
    manifest = parseReleaseManifest(JSON.parse(manifestBytes.toString("utf8")));
  } catch (cause) {
    throw new Error(`本地 release 清单不符合当前契约：${manifestPath}；请重新 materialize。`, {
      cause,
    });
  }

  const documents = new Map<DocumentKind, unknown>();
  for (const file of manifest.files) {
    let bytes: Buffer;
    try {
      bytes = await readRegularFile(path.join(directory, file.path));
    } catch (cause) {
      if (isMissingFile(cause))
        throw new Error(`本地 release 缺少文档：${file.path}；请重新 materialize。`, { cause });
      throw cause;
    }
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
      throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
    try {
      documents.set(file.kind, JSON.parse(bytes.toString("utf8")));
    } catch (cause) {
      throw new Error(`本地 release 文档不是合法 JSON：${file.path}；请重新 materialize。`, {
        cause,
      });
    }
  }

  try {
    return assembleRelease(manifest, documents);
  } catch (cause) {
    throw new Error(`本地 release 内容不符合当前契约：${directory}；请重新 materialize。`, {
      cause,
    });
  }
}
