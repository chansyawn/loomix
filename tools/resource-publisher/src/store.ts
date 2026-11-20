import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  paginateListObjectsV2,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SHARED_IMAGE_PREFIX } from "@loomix/schema/assets";
import { createHash } from "node:crypto";
import { immutableCacheControl } from "./release.ts";

export interface ReleaseStore {
  tryReserve(key: string, bytes: Uint8Array, contentType: string, hash: string): Promise<boolean>;
  put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    hash: string,
    cacheControl?: string,
  ): Promise<void>;
  verify(key: string, size: number, hash: string): Promise<void>;
}

export interface StoredObject {
  key: string;
  size: number;
  modified: Date;
}

export interface MaintenanceStore {
  list(prefix: string): Promise<StoredObject[]>;
  read(key: string): Promise<Uint8Array>;
  tryReserve: ReleaseStore["tryReserve"];
  remove(keys: readonly string[]): Promise<void>;
}

export class ObjectMissingError extends Error {}

function status(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return;
  const metadata = error.$metadata;
  if (typeof metadata !== "object" || metadata === null || !("httpStatusCode" in metadata)) return;
  if (typeof metadata.httpStatusCode === "number") return metadata.httpStatusCode;
}

function isConditionalWriteConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "PreconditionFailed" || error.name === "ConditionalRequestConflict")
    return true;
  return status(error) === 412;
}

export function createR2Store(
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
): ReleaseStore & MaintenanceStore {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    requestHandler: {
      connectionTimeout: 10_000,
      requestTimeout: 30_000,
      throwOnRequestTimeout: true,
    },
  });
  async function put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    hash: string,
    cacheControl = immutableCacheControl,
  ): Promise<void> {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentMD5: createHash("md5").update(bytes).digest("base64"),
        ContentType: contentType,
        CacheControl: cacheControl,
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
      const result = await client
        .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        .catch((error: unknown) => {
          if (status(error) === 404) throw new ObjectMissingError(`找不到对象：${key}`);
          throw error;
        });
      if (
        result.ContentLength !== size ||
        result.Metadata?.sha256 !== hash ||
        (key.startsWith(SHARED_IMAGE_PREFIX) &&
          (result.ContentType !== "image/webp" || result.CacheControl !== immutableCacheControl))
      ) {
        throw new Error(`Remote object verification failed: ${key}`);
      }
    },
    async list(prefix) {
      const objects: StoredObject[] = [];
      for await (const page of paginateListObjectsV2(
        { client },
        { Bucket: bucket, Prefix: prefix },
      ))
        for (const object of page.Contents ?? []) {
          if (
            !object.Key?.startsWith(prefix) ||
            object.Size === undefined ||
            !object.LastModified ||
            !Number.isFinite(object.LastModified.getTime())
          )
            throw new Error(`无效的 R2 对象列表：${prefix}`);
          objects.push({ key: object.Key, size: object.Size, modified: object.LastModified });
        }
      return objects;
    },
    async read(key) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!result.Body) throw new Error(`对象响应无内容：${key}`);
      return result.Body.transformToByteArray();
    },
    async remove(keys) {
      for (let offset = 0; offset < keys.length; offset += 1000) {
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        if (result.Errors?.length)
          throw new Error(
            `删除对象失败：${result.Errors.map((error) => `${error.Key} (${error.Code})`).join(", ")}`,
          );
      }
    },
  };
}
