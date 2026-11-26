import type { DyeingInputs, FrozenDyeingJson } from "../source/hair-dyeing/inputs.ts";
import { createFixture } from "../source/neighbors/fixtures/tables.ts";

function asset<T>(name: string, value: T): FrozenDyeingJson<T> {
  return {
    value,
    file: `prepared/hair-dyeing/${name}.json`,
    source: "dyeing.blk",
    pathId: "42",
    sha256: "a".repeat(64),
  };
}

const rgba = { r: 1, g: 2, b: 3, a: 255 };

export function hairDyeingFixture() {
  const fixture = createFixture({
    318: [[50199, null, null, null, null, null, null, null, null, "白色"]],
    110: [
      [1, { text: "白色系" }, 262, "白色", "白色"],
      [2, 100002, 262],
      [3, { text: "灰色系" }, 244, "灰色", "灰色"],
      [4, 100004, 263],
    ],
    111: [
      [262, 1, 1, "200023_240", 1],
      [263, 2, 0, null, 2, "200023_80"],
      [292, 3, 0, null, 3],
    ],
  });
  const { tables } = fixture.input;
  tables.textmap[2263953776] = { rowOffset: 1001, index: 1, nameZh: "整体发色", nameEn: null };
  tables.textmap[2263953777] = { rowOffset: 1002, index: 2, nameZh: "挑染发色", nameEn: null };
  const inputs: DyeingInputs = {
    hairstyles: [
      asset("hair", {
        configId: 601,
        AssetType: 0,
        regions: [
          {
            regionId: 40,
            regionName: "FrontDye",
            colorMaterial: {
              matProperties: [
                { propertyName: "_TintColorHairBaseShadow" },
                { propertyName: "_BaseColor" },
              ],
            },
          },
          {
            regionId: 6,
            regionName: "OtherDye",
            colorMaterials: [
              { matProperties: [{ propertyName: "_TintColorHairPartial2" }, { propertyName: "" }] },
            ],
          },
          {
            regionId: 9,
            regionName: "DefaultDye",
            colorMaterial: { matProperties: [{ propertyName: "_TintColorHairBase1" }] },
          },
        ],
        regionToColorGroups: { 40: [263, 244, 262], 6: [244] },
        regionIdToDefaultColor: { 40: 267 },
      }),
      asset("excluded", {
        configId: 999,
        AssetType: 0,
        regions: [{ regionId: 1, regionName: "old" }],
      }),
    ],
    groups: asset("groups", {
      colorGroups: [
        {
          id: 244,
          name: "gray_internal",
          colorBlockIds: [134, 245],
          iconPath: null,
          displayColor: rgba,
        },
        {
          id: 262,
          name: "white_internal",
          colorBlockIds: [134],
          iconPath: null,
          displayColor: rgba,
        },
        {
          id: 263,
          name: "other_internal",
          colorBlockIds: [136],
          iconPath: null,
          displayColor: rgba,
        },
        { id: 292, name: "global_only", colorBlockIds: [293], iconPath: null, displayColor: rgba },
      ],
    }),
    blocks: asset("blocks", {
      colorBlocks: [134, 136, 245, 267, 293].map((id) => ({
        id,
        iconPath: null,
        displayColor: rgba,
        type: 0,
      })),
    }),
  };
  return {
    tables,
    inputs,
    hairstyleIds: new Set([601]),
    flowerIds: new Set([50199]),
    cleanup: fixture.cleanup,
  };
}
