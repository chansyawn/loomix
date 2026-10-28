import { afterEach, expect, test, vi } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCollectionObservations, baseCollectionObservations } from "../extraction/schema.ts";
import { verifyBundle } from "./bundle.ts";

vi.mock("../extraction/decode/tables.ts", async (original) => ({
  ...(await original<typeof import("../extraction/decode/tables.ts")>()),
  Tables: class {
    rows() {
      return [];
    }
    uint() {
      return 0;
    }
  },
}));
vi.mock("../profile.ts", async (original) => {
  const { recordTypes } = await import("../extraction/schema.ts");
  return {
    ...(await original<typeof import("../profile.ts")>()),
    expectedCatalog: Object.fromEntries(recordTypes.map((type) => [type, 0])),
  };
});
vi.mock("./admissions.ts", () => ({ verifyAdmissions: () => new Set<number>() }));
vi.mock("../extraction/neighbors/build.ts", () => ({ neighborInput: () => ({}) }));
vi.mock("../extraction/neighbors/verify.ts", () => ({
  verifyNeighbors: () => {
    throw new Error("model_verified");
  },
}));
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

test("bundle verification validates the original observations before checking their base fields", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-observations-verification-"));
  temporary.push(root);
  const file = path.join(root, "content.json");
  fs.writeFileSync(
    file,
    JSON.stringify({
      schemaVersion: 1,
      source: { gameVersion: "0.95.2", dataRevision: 1449213, resourceRevision: 1391927 },
      ingredientCategories: [],
      items: [],
      cropSeeds: [],
      details: [],
    }),
  );
  fs.writeFileSync(path.join(root, "neighbors.json"), "{}");
  await expect(
    verifyBundle({
      reportRoot: root,
      bundle: root,
      staging: root,
      contentFile: file,
      writeReports: false,
      parse: (input) => baseCollectionObservations(parseCollectionObservations(input)),
    }),
  ).rejects.toThrow("model_verified");
});
