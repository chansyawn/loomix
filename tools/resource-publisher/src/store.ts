import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { immutableCacheControl } from "./release.ts";

export interface ReleaseStore {
  tryReserve(key: string, bytes: Uint8Array, contentType: string, hash: string): Promise<boolean>;
  put(key: string, bytes: Uint8Array, contentType: string, hash: string): Promise<void>;
  verify(key: string, size: number, hash: string): Promise<void>;
}

function isConditionalWriteConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "PreconditionFailed" || error.name === "ConditionalRequestConflict")
    return true;
  if (!("$metadata" in error)) return false;
  const metadata = error.$metadata;
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "httpStatusCode" in metadata &&
    metadata.httpStatusCode === 412
  );
}

export function createR2Store(
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
): ReleaseStore {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  async function put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    hash: string,
  ): Promise<void> {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentMD5: createHash("md5").update(bytes).digest("base64"),
        ContentType: contentType,
        CacheControl: immutableCacheControl,
        Metadata: { sha256: hash },
        IfNoneMatch: "*",
      }),
    );
  }
  return {
    async tryReserve(key, bytes, contentType, hash) {
      try {
        await put(key, bytes, contentType, hash);
        return true;
      } catch (error) {
        if (isConditionalWriteConflict(error)) return false;
        throw error;
      }
    },
    put,
    async verify(key, size, hash) {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (result.ContentLength !== size || result.Metadata?.sha256 !== hash) {
        throw new Error(`Remote object verification failed: ${key}`);
      }
    },
  };
}
