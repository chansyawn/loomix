import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { IdSchema } from "@loomix/schema/common";
import { profile } from "../../../profile.ts";
import { exportAssets } from "../../../client/anime-studio/index.ts";
import type { ClientSnapshot } from "../../../client/snapshot.ts";
import { digest } from "../../../workflow/hashing.ts";
import { readJson, writeJson } from "../../../workflow/json.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { IndexedAsset } from "../../types.ts";

const { configPackage, trackerName } = profile.vignettes;
const textAssetType = "MiHoYoBinData";
const objectName = /^[a-f0-9]{8}$/;
const directory = "prepared/vignette-discovery";
const manifestFile = `${directory}/manifest.json`;
const unlockType = "miHoYo.HYG.HYGProtoTool.Effect_UnlockHabitat, Assembly-CSharp";
const questTextId = /^quest_chapter_\d+_task_(\d+)_step_\d+_name$/;

const locatorSchema = z.strictObject({
  name: z.string().regex(objectName),
  pathId: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.strictObject({ tracker: locatorSchema, tasks: locatorSchema.array() });
const taskSchema = z.object({
  name_l10n: z.object({ textId: z.string().regex(questTextId) }),
  taskeffects: z.object({ $type: z.string() }).passthrough().array(),
});
const unlockSchema = z.object({ habitatIdList: IdSchema.array().min(1) });
const trackerSchema = z.object({ isobsolete: z.boolean(), conditionjson: z.string() });
const trackersSchema = z.record(z.string(), z.unknown());

export function isVignetteDiscoveryCandidate(asset: IndexedAsset): boolean {
  return (
    asset.Type === textAssetType &&
    asset.Source === configPackage &&
    objectName.test(asset.Name ?? "")
  );
}

function taskUnlocks(input: unknown) {
  const task = taskSchema.safeParse(input);
  if (!task.success) return [];
  const taskId = IdSchema.parse(Number(questTextId.exec(task.data.name_l10n.textId)?.[1]));
  return task.data.taskeffects.flatMap((effect, index) => {
    if (effect.$type !== unlockType) return [];
    const { habitatIdList } = unlockSchema.parse(effect);
    return habitatIdList.map((templateId, target) => ({
      taskId,
      templateId,
      pointer: `/taskeffects/${index}/habitatIdList/${target}`,
    }));
  });
}

function candidateLocators(index: IndexedAsset[]) {
  const locators = new Map<string, string[]>();
  for (const asset of index) {
    if (!isVignetteDiscoveryCandidate(asset) || !asset.Name) continue;
    const matches = locators.get(asset.Name) ?? [];
    matches.push(asset.PathID);
    locators.set(asset.Name, matches);
  }
  return locators;
}

export async function extractVignetteDiscovery(
  work: string,
  index: IndexedAsset[],
  resolvePath: ClientSnapshot["resolvePath"],
) {
  const staging = fs.mkdtempSync(path.join(work, "vignette-export-"));
  const destination = path.join(work, directory);
  fs.mkdirSync(destination, { recursive: true });
  try {
    await exportAssets({
      input: resolvePath(configPackage),
      output: staging,
      game: profile.animeGame,
      types: [textAssetType],
      names: [objectName.source],
      logFile: path.join(work, "logs/vignette-discovery.log"),
    });
    const exported = path.join(staging, textAssetType);
    const locators = candidateLocators(index);
    const retain = (name: string, bytes: Buffer) => {
      const matches = locators.get(name);
      assert.equal(matches?.length, 1, `Exact vignette discovery object ${name}`);
      fs.writeFileSync(path.join(destination, `${name}.json`), bytes);
      return { name, pathId: matches[0], sha256: digest(bytes) };
    };
    const tracker = retain(
      trackerName,
      fs.readFileSync(path.join(exported, `${trackerName}.json`)),
    );
    const tasks = fs
      .readdirSync(exported)
      .sort()
      .flatMap((entry) => {
        const name = path.basename(entry, ".json");
        if (!entry.endsWith(".json") || !objectName.test(name) || name === trackerName) return [];
        const bytes = fs.readFileSync(path.join(exported, entry));
        const text = bytes.toString();
        if (!text.includes(unlockType) || !taskUnlocks(JSON.parse(text)).length) return [];
        return [retain(name, bytes)];
      });
    writeJson(path.join(work, manifestFile), { tracker, tasks });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

export interface DiscoveryEvidence {
  task(templateId: number): { taskId: number; source: EvidenceSource } | undefined;
  tracker(key: number): { condition: unknown; source: EvidenceSource } | undefined;
}

export function readVignetteDiscovery(work: string, index: IndexedAsset[]): DiscoveryEvidence {
  const manifest = manifestSchema.parse(readJson(path.join(work, manifestFile)));
  assert.equal(manifest.tracker.name, trackerName);
  const locators = candidateLocators(index);
  const load = ({ name, pathId, sha256 }: z.infer<typeof locatorSchema>) => {
    assert.deepEqual(locators.get(name), [pathId], `Exact vignette discovery locator ${name}`);
    const file = `${directory}/${name}.json`;
    const bytes = fs.readFileSync(path.join(work, file));
    assert.equal(digest(bytes), sha256, `Frozen vignette discovery JSON ${name}`);
    return {
      input: JSON.parse(bytes.toString()) as unknown,
      source: (pointer: string): EvidenceSource => ({
        kind: "assetJson",
        file,
        source: configPackage,
        pathId,
        pointer,
        sha256,
      }),
    };
  };
  const tracker = load(manifest.tracker);
  const trackers = trackersSchema.parse(tracker.input);
  const tasks = new Map<number, { taskId: number; source: EvidenceSource }>();
  for (const entry of manifest.tasks) {
    const { input, source } = load(entry);
    const unlocks = taskUnlocks(input);
    assert.ok(unlocks.length, `Missing vignette unlock effect ${entry.name}`);
    for (const { templateId, taskId, pointer } of unlocks) {
      if (!tasks.has(templateId)) tasks.set(templateId, { taskId, source: source(pointer) });
    }
  }
  return {
    task: (templateId) => tasks.get(templateId),
    tracker: (key) => {
      const entry = trackers[key];
      if (entry === undefined) return;
      const rule = trackerSchema.parse(entry);
      if (!rule.isobsolete)
        return {
          condition: JSON.parse(rule.conditionjson) as unknown,
          source: tracker.source(`/${key}/conditionjson`),
        };
    },
  };
}

export async function verifyVignetteDiscoveryExport(
  source: string,
  index: IndexedAsset[],
  resolvePath: ClientSnapshot["resolvePath"],
) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-verify-vignettes-"));
  try {
    await extractVignetteDiscovery(work, index, resolvePath);
    assert.deepEqual(
      readJson(path.join(work, manifestFile)),
      readJson(path.join(source, manifestFile)),
      "Vignette discovery object locators and bytes match the client snapshot",
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
