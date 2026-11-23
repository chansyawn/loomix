import fs from "node:fs";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { PNG } from "pngjs";
import { createFixture } from "../extraction/source/neighbors/fixtures/tables.ts";
import { clientReadRecordsFixture } from "../extraction/fixtures/client-read-records.ts";
import { writeJson } from "../workflow/json.ts";
import { digest } from "../workflow/hashing.ts";
import { objectIdentity } from "../extraction/images/model.ts";
import { bindImages } from "../extraction/images/bind.ts";
import { verifyImages } from "./images.ts";
import type { ImageObject } from "../extraction/images/model.ts";

test("删除候选或篡改绑定及其生产审计仍被独立配置和尺寸断言拒绝", ({ onTestFinished }) => {
  const refs = ["UISprite/Large", "UISprite/Small"];
  const fixture = createFixture({ 325: [[1, null, null, null, refs[1]!, refs[0]!]] });
  onTestFinished(fixture.cleanup);
  const directory = path.join(fixture.directory, "bundle");
  const source = path.join(directory, "source");
  fs.mkdirSync(path.join(source, "prepared"), { recursive: true });
  fs.mkdirSync(path.join(directory, "originals"));
  const packageSha256 = "a".repeat(64),
    packageSource = "PetitPlanet_Data/StreamingAssets/test.blk";
  const objects: ImageObject[] = ["1", "2"].map((pathId, index) => ({
    key: objectIdentity(packageSha256, "Texture2D", pathId),
    packageSha256,
    source: packageSource,
    assetType: "Texture2D",
    pathId,
    resourceName: `Image${pathId}`,
    container: `assets/moleres/rel/sres/${refs[index]}`,
  }));
  writeJson(
    path.join(source, "prepared/asset-index.json"),
    objects.map((object) => ({
      Source: object.source,
      Type: object.assetType,
      PathID: object.pathId,
      Name: object.resourceName,
      Container: object.container,
    })),
  );
  writeJson(path.join(source, "packages.json"), [{ source: packageSource, sha256: packageSha256 }]);
  writeJson(path.join(source, "client-files.json"), [
    { path: packageSource, sha256: packageSha256 },
  ]);
  writeJson(path.join(source, "bindata-manifest.json"), []);
  writeJson(path.join(directory, "source-audit.json"), {
    passed: true,
    records: [{ source: packageSource, matchesManifest: true }],
    configChecks: [],
  });
  const observations = clientReadRecordsFixture();
  observations.imageObjects = objects;
  observations.imageNeeds = [
    {
      id: "item:1:image",
      owner: { kind: "item", id: 1, field: "image" },
      references: refs,
      candidates: objects.map((object, rank) => ({
        object: object.key,
        reference: refs[rank]!,
        rank,
      })),
      variant: "icon",
      required: false,
      sources: [],
      reason: "missing",
    },
  ];
  const originals = objects
    .map((object, index) => {
      const png = PNG.sync.write(new PNG({ width: index + 1, height: index + 1 }));
      const sha256 = digest(png),
        file = `originals/${sha256}.png`;
      fs.writeFileSync(path.join(directory, file), png);
      return { object: object.key, sha256, file, width: index + 1, height: index + 1 };
    })
    .sort((a, b) => a.object.localeCompare(b.object));
  const bindings = bindImages(observations.imageNeeds, originals).bindings;
  expect(() =>
    verifyImages(directory, fixture.input.tables, observations, originals, bindings),
  ).not.toThrow();
  const removed = structuredClone(observations);
  removed.imageNeeds[0]!.candidates.pop();
  const alteredBindings = bindImages(removed.imageNeeds, originals).bindings;
  expect(() =>
    verifyImages(directory, fixture.input.tables, removed, originals, alteredBindings),
  ).toThrow("Complete authoritative candidates");
  const changedBindings = bindings.map((binding) => ({ ...binding, object: objects[0]!.key }));
  expect(() =>
    verifyImages(directory, fixture.input.tables, observations, originals, changedBindings),
  ).toThrow("Independent resolution");
  const changedReference = structuredClone(observations);
  changedReference.imageNeeds[0]!.references = [refs[0]!];
  changedReference.imageNeeds[0]!.candidates.pop();
  expect(() =>
    verifyImages(
      directory,
      fixture.input.tables,
      changedReference,
      originals,
      bindImages(changedReference.imageNeeds, originals).bindings,
    ),
  ).toThrow("Independent image configuration");
});

test("从源表核对友邻服饰的云朵占位图与缺图原因", ({ onTestFinished }) => {
  const references = ["UISprite/Load/Item/Cloud", "uisprite\\load\\item\\cloud.png"];
  const fixture = createFixture({ 325: [[1, null, null, null, references[1]!, references[0]!]] });
  onTestFinished(fixture.cleanup);
  const directory = path.join(fixture.directory, "bundle");
  const source = path.join(directory, "source");
  fs.mkdirSync(path.join(source, "prepared"), { recursive: true });
  writeJson(path.join(source, "prepared/asset-index.json"), []);
  writeJson(path.join(source, "packages.json"), []);
  writeJson(path.join(source, "client-files.json"), []);
  writeJson(path.join(source, "bindata-manifest.json"), []);
  writeJson(path.join(directory, "source-audit.json"), {
    passed: true,
    records: [],
    configChecks: [],
  });

  const observations = clientReadRecordsFixture();
  observations.imageNeeds = [
    {
      id: "neighborOutfit:1:image",
      owner: { kind: "neighborOutfit", id: 1, field: "image" },
      references,
      candidates: [],
      variant: "icon",
      required: false,
      sources: [],
      reason: "neighbor_clothing_placeholder_icon",
    },
  ];
  const bindings = bindImages(observations.imageNeeds, []).bindings;
  const verify = () => verifyImages(directory, fixture.input.tables, observations, [], bindings);
  expect(verify).not.toThrow();

  observations.imageNeeds[0]!.reason = "configured_resource_missing";
  expect(verify).toThrow("Independent outfit image reason");
  observations.imageNeeds[0]!.reason = "neighbor_clothing_placeholder_icon";
  observations.imageNeeds[0]!.required = true;
  expect(verify).toThrow("Independent outfit image requirement");
});
