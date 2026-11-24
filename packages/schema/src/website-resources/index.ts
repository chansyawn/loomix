import { z } from "zod";
import { GameplayTagsSchema } from "../gameplay-tags/index.ts";
import { ImageIndexSchema, imageKey } from "../assets/index.ts";
import { CatalogSchema } from "../catalog/index.ts";
import { ContextSchema, HashSchema, SourceSchema, assertValid } from "../common/identity.ts";
import { createIssueCollector } from "../common/identity.ts";
import type { ValidationIssue } from "../common/identity.ts";
import { DatasetSchema, validateDataset } from "../dataset/index.ts";
import { referencedImages } from "../dataset/images.ts";
import { NeighborsSchema } from "../neighbors/index.ts";
import { StarseaSchema } from "../starsea/index.ts";
import { VignettesSchema } from "../vignettes/index.ts";
import { HairDyeingSchema } from "../hair-dyeing/index.ts";

export const WEBSITE_RESOURCE_MANIFEST_FILE = "resource-manifest.json";

export const documentSchemas = {
  "gameplay-tags": GameplayTagsSchema,
  catalog: CatalogSchema,
  neighbors: NeighborsSchema,
  starsea: StarseaSchema,
  vignettes: VignettesSchema,
  "hair-dyeing": HairDyeingSchema,
  "image-index": ImageIndexSchema,
};
export const WebsiteResourceDocumentTypeSchema = z.enum([
  "gameplay-tags",
  "catalog",
  "neighbors",
  "starsea",
  "vignettes",
  "hair-dyeing",
  "image-index",
]);
export type WebsiteResourceDocumentType = z.infer<typeof WebsiteResourceDocumentTypeSchema>;
const WebsiteResourceDocumentFileSchema = z.strictObject({
  kind: WebsiteResourceDocumentTypeSchema,
  path: z.string().regex(/^(?:[a-z]{2}-[A-Z]{2}\/)?[a-z]+(?:-[a-z]+)*\.json$/),
  sha256: HashSchema,
  bytes: z.number().int().positive(),
});
// 资源上下文只在清单中声明一次，各文档通过哈希绑定到清单。
export const WebsiteResourceManifestSchema = ContextSchema.extend({
  source: SourceSchema,
  files: WebsiteResourceDocumentFileSchema.array(),
}).superRefine((manifest, ctx) => {
  if (
    manifest.files.length !== WebsiteResourceDocumentTypeSchema.options.length ||
    WebsiteResourceDocumentTypeSchema.options.some(
      (kind) => manifest.files.filter((file) => file.kind === kind).length !== 1,
    )
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
export const WebsiteResourcesSchema = z.strictObject({
  manifest: WebsiteResourceManifestSchema,
  dataset: DatasetSchema,
  imageIndex: ImageIndexSchema,
});
export type WebsiteResourceManifest = z.infer<typeof WebsiteResourceManifestSchema>;
export type WebsiteResources = z.infer<typeof WebsiteResourcesSchema>;
export function documentPath(kind: WebsiteResourceDocumentType, locale: string): string {
  return kind === "image-index" ? "image-index.json" : `${locale}/${kind}.json`;
}
export const parseWebsiteResourceManifest = (input: unknown): WebsiteResourceManifest =>
  WebsiteResourceManifestSchema.parse(input);

function validateWebsiteResources(resources: WebsiteResources): ValidationIssue[] {
  const { dataset, imageIndex, manifest } = resources;
  const { issues, issue } = createIssueCollector("invalid_website_resources");
  issues.push(...validateDataset(dataset));
  for (const field of ["datasetId", "locale", "formatVersion"] as const)
    if (manifest[field] !== dataset.context[field])
      issue(["manifest", field], "Website resource context mismatch");
  for (const field of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"] as const)
    if (manifest.source[field] !== dataset.source[field])
      issue(["manifest", "source", field], "Website resource source mismatch");
  const expected = new Set(referencedImages(dataset).map(imageKey));
  const seen = new Set<string>();
  const files = new Map<string, (typeof imageIndex.images)[number]>();
  for (const [index, image] of imageIndex.images.entries()) {
    const key = imageKey(image);
    if (seen.has(key) || !expected.has(key))
      issue(["imageIndex", "images", index], "Duplicate or unreferenced image");
    seen.add(key);
    const previous = files.get(image.file);
    if (
      previous &&
      (previous.bytes !== image.bytes ||
        previous.width !== image.width ||
        previous.height !== image.height)
    )
      issue(["imageIndex", "images", index], "Conflicting image file metadata");
    files.set(image.file, image);
  }
  for (const key of expected)
    if (!seen.has(key)) issue(["imageIndex", "images"], `Missing image ${key}`);
  return issues;
}
export function parseWebsiteResources(input: unknown): WebsiteResources {
  const resources = WebsiteResourcesSchema.parse(input);
  assertValid(validateWebsiteResources(resources));
  return resources;
}

export function assembleWebsiteResources(
  manifest: WebsiteResourceManifest,
  documents: ReadonlyMap<WebsiteResourceDocumentType, unknown>,
): WebsiteResources {
  return parseWebsiteResources({
    manifest,
    dataset: {
      context: {
        formatVersion: manifest.formatVersion,
        datasetId: manifest.datasetId,
        locale: manifest.locale,
      },
      source: manifest.source,
      gameplayTags: documents.get("gameplay-tags"),
      catalog: documents.get("catalog"),
      neighbors: documents.get("neighbors"),
      starsea: documents.get("starsea"),
      vignettes: documents.get("vignettes"),
      hairDyeing: documents.get("hair-dyeing"),
    },
    imageIndex: documents.get("image-index"),
  });
}
