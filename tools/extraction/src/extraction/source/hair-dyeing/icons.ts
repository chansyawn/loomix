import { profile } from "../../../profile.ts";
import type { IndexedAsset } from "../../types.ts";

const spritePath =
  /^UISprite\/Load\/Appearance\/(?:EyesPattern\/(\d+_(?:Appearance_Pattern_Block|P_hair_[A-Za-z0-9_]+))|(Icon_Appearance_Pattern\d*_\d+))\.png$/;

export function resolveDyeingIcon(index: readonly IndexedAsset[], reference: string) {
  const match = spritePath.exec(reference);
  const name = match?.[1] ?? match?.[2];
  if (!name) throw new Error(`Unsupported dyeing icon path ${reference}`);
  const { spritePackage, spriteAtlas } = profile.hairDyeing;
  const matches = index.filter(
    (asset) =>
      asset.Source === spritePackage &&
      asset.Type === "Sprite" &&
      asset.Name === name &&
      asset.Container === spriteAtlas,
  );
  if (matches.length !== 1) throw new Error(`Missing or ambiguous dyeing icon ${reference}`);
  return {
    reference,
    source: spritePackage,
    container: spriteAtlas,
    resourceName: name,
    assetType: "Sprite",
    pathId: matches[0].PathID,
  };
}
