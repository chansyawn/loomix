import { expect, test } from "vite-plus/test";
import { createAssetRegistry } from "./assets.ts";

const original = {
  file: "exports/image.png",
  sha256: "a".repeat(64),
  width: 1024,
  height: 512,
  source: "source",
  container: "container",
  assetType: "Texture2D",
  pathId: "9223372036854775807",
};

test("one source image keeps independent icon, banner and illustration jobs", () => {
  const registry = createAssetRegistry();
  const banner = registry.register(original, "furniture.set");
  const icon = registry.register(original, "furniture.item");
  const illustration = registry.register(original);
  expect(registry.jobs.size).toBe(3);
  expect(banner.assetId).toBe(icon.assetId);
  expect(icon.assetId).toBe(illustration.assetId);
  expect(registry.image(original.file, "banner")).toEqual(banner);
  expect(registry.image(original.file)).toEqual(icon);
});

test("a conflicting source identity cannot silently overwrite its bytes", () => {
  const registry = createAssetRegistry();
  registry.register(original);
  expect(() => registry.register({ ...original, sha256: "b".repeat(64) })).toThrow(
    "Conflicting original",
  );
  expect(() => registry.image("missing.png")).toThrow("Unregistered image");
});
