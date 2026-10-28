import { z } from "zod";
import { AssetsSchema, imageKey } from "../assets/index.ts";
import { CatalogSchema } from "../catalog/index.ts";
import { ContextSchema, HashSchema, SourceSchema, assertValid } from "../common/identity.ts";
import type { ValidationIssue } from "../common/identity.ts";
import { DatasetSchema, validateDataset } from "../dataset/index.ts";
import { referencedImages } from "../dataset/images.ts";
import { NeighborsSchema } from "../neighbors/index.ts";
import { WorldSchema } from "../world/index.ts";

export const documentSchemas = {
  catalog: CatalogSchema,
  neighbors: NeighborsSchema,
  world: WorldSchema,
  assets: AssetsSchema,
};
export type DocumentKind = keyof typeof documentSchemas;
export const DocumentKindSchema = z.enum(["catalog", "neighbors", "world", "assets"]);
export const ReleaseIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const ReleaseMarkerSchema = z.strictObject({
  release: ReleaseIdSchema,
  manifestSha256: HashSchema,
});
export const FileSchema = z.strictObject({
  kind: DocumentKindSchema,
  path: z.string().regex(/^(?:[a-z]{2}-[A-Z]{2}\/)?[a-z]+\.json$/),
  sha256: HashSchema,
  bytes: z.number().int().positive(),
});
export const ReleaseManifestSchema = ContextSchema.extend({
  source: SourceSchema,
  files: FileSchema.array(),
}).superRefine((manifest, ctx) => {
  const expected = Object.keys(documentSchemas);
  if (
    manifest.files.length !== expected.length ||
    expected.some((kind) => manifest.files.filter((file) => file.kind === kind).length !== 1)
  )
    ctx.addIssue({
      code: "custom",
      path: ["files"],
      message: "Exactly one document of every kind is required",
    });
  for (const [index, file] of manifest.files.entries())
    if (file.path !== documentPath(file.kind, manifest.locale))
      ctx.addIssue({
        code: "custom",
        path: ["files", index, "path"],
        message: "Unexpected document path",
      });
});
export const ReleaseSchema = z.strictObject({
  manifest: ReleaseManifestSchema,
  dataset: DatasetSchema,
  assets: AssetsSchema,
});
export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;
export type ReleaseMarker = z.infer<typeof ReleaseMarkerSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export function documentPath(kind: DocumentKind, locale: string): string {
  return kind === "assets" ? "assets.json" : `${locale}/${kind}.json`;
}
export const parseReleaseManifest = (input: unknown): ReleaseManifest =>
  ReleaseManifestSchema.parse(input);

export function validateRelease(release: Release): ValidationIssue[] {
  const { dataset, assets, manifest } = release;
  const issues = validateDataset(dataset);
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ code: "invalid_release", path, message });
  for (const field of ["snapshotId", "locale", "formatVersion"] as const) {
    if (manifest[field] !== dataset.context[field])
      issue(["manifest", field], "Release context mismatch");
    if (assets[field] !== dataset.context[field])
      issue(["assets", field], "Assets context mismatch");
  }
  for (const field of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"] as const)
    if (manifest.source[field] !== dataset.source[field])
      issue(["manifest", "source", field], "Release source mismatch");
  const expected = new Set(referencedImages(dataset).map(imageKey));
  const seen = new Set<string>();
  const files = new Map<string, (typeof assets.images)[number]>();
  for (const [index, image] of assets.images.entries()) {
    const key = imageKey(image);
    if (seen.has(key) || !expected.has(key))
      issue(["assets", "images", index], "Duplicate or unreferenced image");
    seen.add(key);
    const previous = files.get(image.file);
    if (
      previous &&
      (previous.bytes !== image.bytes ||
        previous.width !== image.width ||
        previous.height !== image.height)
    )
      issue(["assets", "images", index], "Conflicting image file metadata");
    files.set(image.file, image);
  }
  for (const key of expected)
    if (!seen.has(key)) issue(["assets", "images"], `Missing image ${key}`);
  return issues;
}
export function parseRelease(input: unknown): Release {
  const release = ReleaseSchema.parse(input);
  assertValid(validateRelease(release));
  return release;
}

export function assembleRelease(
  manifest: ReleaseManifest,
  documents: ReadonlyMap<DocumentKind, unknown>,
): Release {
  return parseRelease({
    manifest,
    dataset: {
      context: {
        formatVersion: manifest.formatVersion,
        snapshotId: manifest.snapshotId,
        locale: manifest.locale,
      },
      source: manifest.source,
      catalog: documents.get("catalog"),
      neighbors: documents.get("neighbors"),
      world: documents.get("world"),
    },
    assets: documents.get("assets"),
  });
}
