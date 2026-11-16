import type { ImageRef } from "@loomix/schema/assets";
import type { EvidenceSource } from "../evidence/domain-schema.ts";
import type { IndexedAsset } from "../types.ts";
import type { ImageOwner, ImageNeed, ImageObject } from "../images/model.ts";
import { objectIdentity, uniqueObjects } from "../images/model.ts";
import type { IconMatch } from "../types.ts";
import { createIconResolver } from "../images/resolve.ts";

export type LocatedImage = Pick<ImageObject, "source" | "pathId" | "container" | "resourceName"> & {
  reference: string;
  assetType: string;
};

export function imageCollector(index: IndexedAsset[], packages: ReadonlyMap<string, string>) {
  const needs: ImageNeed[] = [];
  const objects: ImageObject[] = [];
  const seen = new Map<string, ImageObject>();
  const locators = new Map<string, Set<string>>();
  for (const asset of index) {
    const key = JSON.stringify([asset.Source, asset.Type, asset.Name, asset.Container]);
    const ids = locators.get(key) ?? new Set<string>();
    ids.add(asset.PathID);
    locators.set(key, ids);
  }
  const resolve = createIconResolver(
    index.filter((a) => a.Type === "Texture2D"),
    index.filter((a) => a.Type === "Sprite"),
  );
  const locate = (asset: LocatedImage): ImageObject => {
    if (asset.assetType !== "Texture2D" && asset.assetType !== "Sprite")
      throw new Error(`Unexpected image type ${asset.assetType}`);
    const packageSha256 = packages.get(asset.source);
    if (!packageSha256) throw new Error(`Unfrozen image package ${asset.source}`);
    const key = objectIdentity(packageSha256, asset.assetType, asset.pathId);
    const matches = locators.get(
      JSON.stringify([asset.source, asset.assetType, asset.resourceName, asset.container]),
    );
    if (!matches || matches.size !== 1 || !matches.has(asset.pathId))
      throw new Error(
        `AnimeStudio cannot uniquely address image ${asset.source}:${asset.resourceName}:${asset.pathId}`,
      );
    const object: ImageObject = {
      key,
      packageSha256,
      source: asset.source,
      assetType: asset.assetType,
      pathId: asset.pathId,
      container: asset.container,
      resourceName: asset.resourceName,
    };
    // 每条来源关联先校验再去重；相同包字节的路径别名仍保留在 observations 中。
    const previous = seen.get(object.key);
    uniqueObjects(previous ? [previous, object] : [object]);
    seen.set(object.key, object);
    objects.push(object);
    return object;
  };
  const need = (
    owner: ImageOwner,
    candidates: readonly LocatedImage[],
    variant: ImageRef["variant"],
    sources: EvidenceSource[],
    reason: string,
    required = false,
    references = candidates.map((candidate) => candidate.reference),
  ): string => {
    const id = `${owner.kind}:${owner.id}:${owner.field}`;
    if (needs.some((entry) => entry.id === id)) throw new Error(`Duplicate image owner ${id}`);
    let lastRank = -1;
    needs.push({
      id,
      owner,
      references,
      variant,
      required,
      sources,
      reason,
      candidates: candidates.map((asset) => {
        const rank = references.findIndex(
          (reference, rank) => rank > lastRank && reference === asset.reference,
        );
        if (rank < 0) throw new Error(`Candidate has no configured rank ${asset.reference}`);
        lastRank = rank;
        return { object: locate(asset).key, reference: asset.reference, rank };
      }),
    });
    return id;
  };
  const configured = (
    owner: ImageOwner,
    reference: string | null,
    variant: ImageRef["variant"],
    sources: EvidenceSource[],
    required = false,
  ): string => {
    const match: IconMatch | null = reference ? resolve(reference) : null;
    const candidates =
      match?.matched && match.source && match.pathId && match.container && match.resourceName
        ? [
            {
              ...match,
              source: match.source,
              pathId: match.pathId,
              container: match.container,
              resourceName: match.resourceName,
            },
          ]
        : [];
    return need(
      owner,
      candidates,
      variant,
      sources,
      reference ? "configured_resource_missing" : "image_not_configured",
      required,
      reference ? [reference] : [],
    );
  };
  return { needs, objects, need, configured };
}
