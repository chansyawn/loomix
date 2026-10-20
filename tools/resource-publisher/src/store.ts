import {
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { immutableCacheControl } from "./release.ts";

export interface ReleaseStore {
  hasObjects(prefix: string): Promise<boolean>;
  put(key: string, bytes: Uint8Array, contentType: string, hash: string): Promise<void>;
  verify(key: string, size: number, hash: string): Promise<void>;
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
  return {
    async hasObjects(prefix) {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1 }),
      );
      return (result.Contents?.length ?? 0) > 0;
    },
    async put(key, bytes, contentType, hash) {
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
    },
    async verify(key, size, hash) {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (result.ContentLength !== size || result.Metadata?.sha256 !== hash) {
        throw new Error(`Remote object verification failed: ${key}`);
      }
    },
  };
}
