import { expect, test } from "vite-plus/test";
import { bindImages } from "../../images/bind.ts";
import { imageCollector } from "../images.ts";
import { collectNeighborOutfitImage } from "./outfit-image.ts";

const cloud = "UISprite/Load/Item/Cloud";
const large = "UISprite/Load/Item/Large";
const small = "UISprite/Load/Item/Small";
const source = "package.blk";

function createCollector() {
  return imageCollector(
    [cloud, large, small].map((reference, index) => ({
      Name: reference.split("/").at(-1),
      Type: "Texture2D",
      Source: source,
      PathID: String(index + 1),
      Container: `assets/moleres/rel/sres/${reference}.png`,
    })),
    new Map([[source, "a".repeat(64)]]),
  );
}

test("仅配置云朵图时保留原始引用与缺图原因，且不导出占位资源", () => {
  const images = createCollector();
  const references = [cloud, " uisprite\\load\\item\\CLOUD.PNG "];
  const use = collectNeighborOutfitImage(images, 60291, references, []);
  const bound = bindImages(images.needs, []);

  expect(images.needs[0]).toMatchObject({ references, candidates: [], required: false });
  expect(images.objects).toEqual([]);
  expect(bound.bindings).toEqual([
    { use, object: null, reason: "neighbor_clothing_placeholder_icon" },
  ]);
  expect(bound.image(use)).toBeNull();
});

test.each([
  { references: [large, small], selected: large },
  { references: [cloud, small], selected: small },
  { references: [large, cloud], selected: large },
  { references: [" ", small], selected: small },
])("按大图、小图顺序选第一条非占位路径 $references", ({ references, selected }) => {
  const images = createCollector();
  collectNeighborOutfitImage(images, 60291, references, []);

  expect(images.needs[0]).toMatchObject({
    references: [selected],
    candidates: [{ reference: selected }],
    required: true,
  });
});

test("图标未配置或首选非占位图无法解析时仍报错", () => {
  const images = createCollector();
  expect(() => collectNeighborOutfitImage(images, 60291, [" "], [])).toThrow(
    "Missing neighbor outfit icon 60291",
  );

  const missing = "UISprite/Load/Item/Missing";
  const use = collectNeighborOutfitImage(images, 60291, [missing, small], []);
  expect(images.needs[0]).toMatchObject({ references: [missing], required: true });
  expect(() => bindImages(images.needs, [])).toThrow(`Missing required image ${use}`);
});
