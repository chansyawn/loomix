import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32 } from "node:zlib";
import { z } from "zod";
import { IdSchema } from "@loomix/schema/common";
import { profile } from "../../../profile.ts";
import { exportAssets } from "../../../client/anime-studio/index.ts";
import type { ClientSnapshot } from "../../../client/snapshot.ts";
import { digest } from "../../../workflow/hashing.ts";
import { readJson, writeJson } from "../../../workflow/json.ts";
import type { IndexedAsset } from "../../types.ts";
import { ObbReader } from "../decode/obb.ts";
import { readUIntVector } from "../decode/tables.ts";

const folder = "prepared/hair-dyeing";
const manifestFile = `${folder}/manifest.json`;
const textAssetType = "MiHoYoBinData";
const objectNamePattern = /^[a-f0-9]{8}$/;
const configDirectory = "Data/Json/Dyeing";
const { configPackage, groupsName, blocksName } = profile.hairDyeing;

const idList = IdSchema.array();
const channel = z.number().int().min(0).max(255);
const paletteEntry = z.object({
  id: IdSchema,
  displayColor: z.object({ r: channel, g: channel, b: channel, a: channel }),
  iconPath: z.string().nullable(),
});
const groupsSchema = z.object({
  colorGroups: paletteEntry.extend({ name: z.string(), colorBlockIds: idList }).array(),
});
const blocksSchema = z.object({
  colorBlocks: paletteEntry
    .extend({
      type: z.union([z.literal(0), z.literal(1)]),
      replaceMaterial: z.boolean().optional(),
    })
    .array(),
});
const assetConfigKey = z.object({ configId: IdSchema, AssetType: z.number().int().nonnegative() });
const idKey = z.string().regex(/^[1-9]\d*$/);
const colorMaterial = z.object({
  matProperties: z.object({ propertyName: z.string() }).array().nullish(),
});
const dyeingRegion = z.object({
  regionId: IdSchema,
  regionName: z.string().min(1),
  colorMaterial: colorMaterial.nullish(),
  colorMaterials: colorMaterial.array().nullish(),
});
export type DyeingRegion = z.infer<typeof dyeingRegion>;
const hairstyleSchema = assetConfigKey.extend({
  AssetType: z.literal(0),
  regions: dyeingRegion.array(),
  regionToColorGroups: z.record(idKey, idList).nullish(),
  regionIdToDefaultColor: z.record(idKey, IdSchema).nullish(),
});

interface AssetLocation {
  logicalPath: string;
  crc32: string;
}

interface ConfigObject extends AssetLocation {
  name: string;
  pathId: string;
  sha256: string;
}

interface DyeingSourceManifest {
  source: string;
  groups: ConfigObject;
  blocks: ConfigObject;
  configs: (ConfigObject & { id: number; assetType: number })[];
}

export interface FrozenDyeingJson<T> {
  value: T;
  file: string;
  source: string;
  pathId: string;
  sha256: string;
}

export function isHairDyeingConfigCandidate(asset: IndexedAsset): boolean {
  return (
    asset.Type === textAssetType &&
    !!asset.Name &&
    objectNamePattern.test(asset.Name) &&
    asset.Source === configPackage
  );
}

export function listDyeingPaths(reader: ObbReader) {
  const root = reader.requiredFields(reader.u32(0));
  const wrapper = reader.requiredFields(reader.ref(root[0]));
  const offsets = (field: number) => {
    const start = reader.ref(wrapper[field]);
    const count = reader.u32(start);
    assert.ok(count <= 200_000 && reader.inRange(start + 4, count * 4), "Invalid cs.obb vector");
    return Array.from({ length: count }, (_, index) => start + 4 + index * 4);
  };
  const directories = offsets(1).map((position) => reader.string(position)?.text);
  const ends = readUIntVector(reader, wrapper[2]);
  const starts = readUIntVector(reader, wrapper[3]);
  assert.ok(ends && starts && directories.length === ends.length && ends.length === starts.length);
  let from = 0;
  let to = directories.length;
  for (const component of configDirectory.split("/")) {
    let found = false;
    for (let index = from; index < to; index = ends[index]) {
      assert.ok(ends[index] > index && ends[index] <= to, "Invalid cs.obb directory span");
      if (directories[index] !== component) continue;
      from = index + 1;
      to = ends[index];
      found = true;
      break;
    }
    assert.ok(found, `Missing cs.obb directory ${component}`);
  }
  assert.equal(directories[from], "AssetConfigs");
  assert.equal(ends[from], to);
  const names = offsets(0);
  const entries = offsets(6);
  assert.equal(names.length, entries.length);
  const location = (index: number, directory: string): AssetLocation => {
    const fileName = reader.string(names[index])?.text;
    const fields = reader.requiredFields(reader.ref(entries[index]));
    assert.ok(fileName);
    assert.equal(reader.u32(fields[1]), index, "cs.obb path entry index");
    const logicalPath = `${directory}/${fileName}`;
    const hash = crc32(logicalPath);
    assert.equal(reader.u32(fields[0]), hash, `cs.obb path CRC32 ${logicalPath}`);
    return { logicalPath, crc32: hash.toString(16).padStart(8, "0") };
  };
  const blocks = location(starts[from - 1], configDirectory);
  const groups = location(starts[from - 1] + 1, configDirectory);
  assert.equal(blocks.logicalPath, `${configDirectory}/ColorBlockData.json`);
  assert.equal(groups.logicalPath, `${configDirectory}/ColorGroupData.json`);
  assert.equal(starts[from] - starts[from - 1], 2);
  const configs = new Map<number, AssetLocation>();
  for (let index = starts[from]; index < (starts[to] ?? names.length); index++) {
    const entry = location(index, `${configDirectory}/AssetConfigs`);
    const match = /\/([1-9]\d*)\.json$/.exec(entry.logicalPath);
    assert.ok(match && !configs.has(Number(match[1])), `Invalid dyeing path ${entry.logicalPath}`);
    configs.set(Number(match[1]), entry);
  }
  assert.ok(configs.size, "No dyeing configuration paths");
  return { groups, blocks, configs };
}

export async function extractDyeingInputs(
  work: string,
  reader: ObbReader,
  index: IndexedAsset[],
  resolvePath: ClientSnapshot["resolvePath"],
): Promise<void> {
  const locations = listDyeingPaths(reader);
  const candidates = new Map<string, IndexedAsset[]>();
  for (const asset of index.filter(isHairDyeingConfigCandidate)) {
    const matches = candidates.get(asset.Name!) ?? [];
    matches.push(asset);
    candidates.set(asset.Name!, matches);
  }
  const staging = fs.mkdtempSync(path.join(work, "dyeing-export-"));
  const destination = path.join(work, folder);
  fs.mkdirSync(destination, { recursive: true });
  const configs = new Map<number, DyeingSourceManifest["configs"][number]>();
  const describe = (name: string, bytes: Buffer, location: AssetLocation): ConfigObject => {
    const matches = candidates.get(name) ?? [];
    assert.equal(matches.length, 1, `Exact dyeing object ${name}`);
    return { ...location, name, pathId: matches[0].PathID, sha256: digest(bytes) };
  };
  try {
    await exportAssets({
      input: resolvePath(configPackage),
      output: staging,
      game: profile.animeGame,
      types: [textAssetType],
      names: [objectNamePattern.source],
      logFile: path.join(work, "logs/hair-dyeing.log"),
    });
    const directory = path.join(staging, textAssetType);
    const retain = (name: string, bytes: Buffer) =>
      fs.writeFileSync(path.join(destination, `${name}.json`), bytes);
    const palette = (name: string, schema: z.ZodType, location: AssetLocation) => {
      const bytes = fs.readFileSync(path.join(directory, `${name}.json`));
      schema.parse(JSON.parse(bytes.toString()));
      retain(name, bytes);
      return describe(name, bytes, location);
    };
    const groups = palette(groupsName, groupsSchema, locations.groups);
    const blocks = palette(blocksName, blocksSchema, locations.blocks);
    for (const entry of fs.readdirSync(directory)) {
      const name = path.basename(entry, ".json");
      if (!entry.endsWith(".json") || !candidates.has(name)) continue;
      const bytes = fs.readFileSync(path.join(directory, entry));
      const text = bytes.toString();
      if (!text.includes('"configId"') || !text.includes('"AssetType"')) continue;
      const parsed: unknown = JSON.parse(text);
      const result = assetConfigKey.safeParse(parsed);
      if (
        !result.success ||
        !locations.configs.has(result.data.configId) ||
        typeof parsed !== "object" ||
        parsed === null ||
        !("regions" in parsed)
      )
        continue;
      const { configId: id, AssetType: assetType } = result.data;
      assert.ok(!configs.has(id), `Duplicate dyeing config ID ${id}`);
      configs.set(id, { ...describe(name, bytes, locations.configs.get(id)!), id, assetType });
      if (assetType === 0) {
        hairstyleSchema.parse(parsed);
        retain(name, bytes);
      }
    }
    assert.equal(configs.size, locations.configs.size, "Complete dyeing configuration coverage");
    writeJson(path.join(work, manifestFile), {
      source: configPackage,
      groups,
      blocks,
      configs: [...configs.values()].sort((left, right) => left.id - right.id),
    } satisfies DyeingSourceManifest);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

export function readDyeingInputs(work: string, index: IndexedAsset[]) {
  const manifest = readJson<DyeingSourceManifest>(path.join(work, manifestFile));
  const locations = listDyeingPaths(new ObbReader(path.join(work, "prepared/cs.obb")));
  assert.equal(manifest.source, configPackage);
  const indexed = new Set(
    index.filter(isHairDyeingConfigCandidate).map((asset) => `${asset.Name}:${asset.PathID}`),
  );
  const checkLocation = (entry: ConfigObject, location: AssetLocation | undefined) => {
    assert.ok(
      location &&
        indexed.has(`${entry.name}:${entry.pathId}`) &&
        objectNamePattern.test(entry.name),
      "Exact dyeing configuration locator",
    );
    assert.deepEqual({ logicalPath: entry.logicalPath, crc32: entry.crc32 }, location);
  };
  const load = <T>(entry: ConfigObject, schema: z.ZodType<T>): FrozenDyeingJson<T> => {
    const file = `${folder}/${entry.name}.json`;
    const bytes = fs.readFileSync(path.join(work, file));
    assert.equal(digest(bytes), entry.sha256, `Frozen dyeing JSON ${entry.logicalPath}`);
    return {
      value: schema.parse(JSON.parse(bytes.toString())),
      file,
      source: manifest.source,
      pathId: entry.pathId,
      sha256: entry.sha256,
    };
  };
  assert.equal(manifest.groups.name, groupsName);
  assert.equal(manifest.blocks.name, blocksName);
  checkLocation(manifest.groups, locations.groups);
  checkLocation(manifest.blocks, locations.blocks);
  const seen = new Set<number>();
  const hairstyles = manifest.configs.flatMap((entry) => {
    assert.ok(!seen.has(entry.id) && Number.isSafeInteger(entry.assetType) && entry.assetType >= 0);
    seen.add(entry.id);
    checkLocation(entry, locations.configs.get(entry.id));
    if (entry.assetType !== 0) return [];
    const config = load(entry, hairstyleSchema);
    assert.equal(config.value.configId, entry.id);
    return [config];
  });
  assert.equal(seen.size, locations.configs.size);
  return {
    groups: load(manifest.groups, groupsSchema),
    blocks: load(manifest.blocks, blocksSchema),
    hairstyles,
  };
}

export type DyeingInputs = ReturnType<typeof readDyeingInputs>;

export function dyeingSourceFiles(work: string): string[] {
  return fs.existsSync(path.join(work, manifestFile)) ? [configPackage] : [];
}

export async function verifyDyeingExport(
  source: string,
  active: { cs: string; ed: string },
  index: IndexedAsset[],
  resolvePath: ClientSnapshot["resolvePath"],
): Promise<void> {
  const clientBytes = fs.readFileSync(active.cs);
  assert.ok(
    clientBytes.equals(fs.readFileSync(path.join(source, "prepared/cs.obb"))),
    "Frozen cs.obb matches active configuration",
  );
  assert.ok(
    fs.readFileSync(active.ed).equals(fs.readFileSync(path.join(source, "prepared/ed.obb"))),
    "Frozen ed.obb matches active configuration",
  );
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-verify-dyeing-"));
  try {
    await extractDyeingInputs(work, new ObbReader(clientBytes), index, resolvePath);
    const actual = readJson<DyeingSourceManifest>(path.join(work, manifestFile));
    const expected = readJson<DyeingSourceManifest>(path.join(source, manifestFile));
    assert.deepEqual(
      actual,
      expected,
      "Dyeing object locators and bytes match the client snapshot",
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
