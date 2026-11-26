import assert from "node:assert/strict";
import { profile } from "../../../profile.ts";
import type { DyeingRegion } from "./inputs.ts";

const base = /^_TintColorHairBase(?:1|2|Shadow)$/;
const partial = /^_TintColorHairPartial(?:1|2|Shadow)$/;
const legacy = ["_TintColorR", "_TintColorG", "_TintColorB", "_TintColorA"];

export function materialProperties(region: DyeingRegion) {
  return [
    ...(region.colorMaterial?.matProperties ?? []).map(({ propertyName }, index) => ({
      propertyName,
      pointer: `/colorMaterial/matProperties/${index}/propertyName`,
    })),
    ...(region.colorMaterials ?? []).flatMap((material, materialIndex) =>
      (material.matProperties ?? []).map(({ propertyName }, index) => ({
        propertyName,
        pointer: `/colorMaterials/${materialIndex}/matProperties/${index}/propertyName`,
      })),
    ),
  ];
}

export function resolveDyeingRegion(
  itemId: number,
  regionId: number,
  properties: ReturnType<typeof materialProperties>,
  regionCount: number,
  modes: readonly string[],
) {
  const baseProperties = properties.filter(({ propertyName }) => base.test(propertyName));
  const partialProperties = properties.filter(({ propertyName }) => partial.test(propertyName));
  assert.ok(
    !baseProperties.length || !partialProperties.length,
    `Mixed dyeing material for ${itemId}:${regionId}`,
  );
  const text = profile.hairDyeing.regionText;
  if (baseProperties.length) return { hash: text.base, properties: baseProperties, legacy: false };
  if (partialProperties.length)
    return { hash: text.partial, properties: partialProperties, legacy: false };
  const legacyProperties = properties.filter(({ propertyName }) => legacy.includes(propertyName));
  const legacyNames = new Set(legacyProperties.map(({ propertyName }) => propertyName));
  assert.ok(
    legacyNames.size === legacy.length &&
      regionCount === 1 &&
      modes.length > 0 &&
      modes.every((mode) => mode === "full"),
    `Unknown dyeing material for ${itemId}:${regionId}`,
  );
  return { hash: text.base, properties: legacyProperties, legacy: true };
}
