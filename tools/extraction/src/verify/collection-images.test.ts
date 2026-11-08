import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { afterEach, expect, test, vi } from "vite-plus/test";
import type { CollectionObservations } from "../extraction/schema.ts";
import { verifyStageImages } from "./collection-images.ts";

const asset = {
  matched: true,
  assetType: "Texture2D",
  resourceName: "shared",
  container: "assets/shared.png",
  source: "client/package.blk",
  pathId: "1",
  sourceVariants: [{ source: "client/package.blk", pathId: "1" }],
  matchMethod: "exact_config_path",
};
vi.mock("../extraction/decode/tables.ts", () => ({
  Tables: class {
    rows() {
      return [11, 12].map((id) => ({ root: 325, rowOffset: id * 10 }));
    }
    id(row: { rowOffset: number }) {
      return row.rowOffset / 10;
    }
    string(_row: unknown, field: number) {
      return field === 4 ? "UISprite/shared" : null;
    }
  },
}));
vi.mock("../extraction/images/resolve.ts", () => ({
  createIconResolver: () => (reference: string) => ({ ...asset, reference }),
}));
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-stage-images-"));
  directories.push(bundle);
  const write = (name: string, value: unknown) => {
    const file = path.join(bundle, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
  };
  const candidate = (id: number) => ({
    id,
    group: "plants.item",
    reference: "UISprite/shared",
    source: asset.source,
    pathId: asset.pathId,
    container: asset.container,
    resourceName: asset.resourceName,
    assetType: asset.assetType,
  });
  const file = "stage-exports/shared.png";
  const bytes = PNG.sync.write(new PNG({ width: 1, height: 1 }));
  fs.mkdirSync(path.join(bundle, "stage-exports"));
  fs.writeFileSync(path.join(bundle, file), bytes);
  const original = {
    ...candidate(11),
    file,
    width: 1,
    height: 1,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
  write("stage-image-candidates.json", [candidate(11), candidate(12)]);
  write("stage-image-originals.json", [original]);
  write("stage-image-manifest.json", [original, { ...original, id: 12 }]);
  write("source-audit.json", { records: [{ source: asset.source, matchesManifest: true }] });
  for (const name of ["textures", "sprites"]) write(`prepared/${name}.json`, []);
  const audit = [11, 12].map((id) => ({
    kind: "stage",
    id,
    rowOffset: id * 10,
    references: [
      { field: 5, reference: null, match: null },
      { field: 4, reference: "UISprite/shared", match: { ...asset, reference: "UISprite/shared" } },
    ],
    reason: null,
  }));
  write("plant-image-audit.json", audit);
  write("evidence/plant-image-audit.json", audit);
  const catalog = {
    growths: [
      {
        stages: [
          { id: 11, image: file },
          { id: 12, image: file },
        ],
      },
    ],
  } as unknown as CollectionObservations;
  return { bundle, catalog, write };
}

test("stage image verification accepts one exported object referenced by several stages", () => {
  const { bundle, catalog } = fixture();
  expect(() => verifyStageImages(catalog, bundle)).not.toThrow();
});
test("stage image verification rejects swapped references and removed configured candidates", () => {
  const { bundle, catalog, write } = fixture();
  catalog.growths[0].stages[0].image = "stage-exports/another.png";
  expect(() => verifyStageImages(catalog, bundle)).toThrow();
  write("stage-image-candidates.json", []);
  expect(() => verifyStageImages(catalog, bundle)).toThrow(/Independent stage image candidates/);
});
