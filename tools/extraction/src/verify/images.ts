import assert from "node:assert/strict";
import { clientIconSlots } from "../extraction/client-icons/model.ts";
import { clientIconAtlas } from "../extraction/client-icons/resolve.ts";
import { neighborImageSlots } from "../extraction/neighbor-images/model.ts";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { digest } from "../workflow/hashing.ts";
import { readJson } from "../workflow/json.ts";
import { within } from "../paths.ts";
import type { ClientReadRecords } from "../extraction/model.ts";
import type {
  ImageBinding,
  OriginalImage,
  ImageObject,
  ImageNeed,
} from "../extraction/images/model.ts";
import type { IndexedAsset, SourceAudit, BinDataAsset } from "../extraction/types.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { dyeingSourceFiles, readDyeingInputs } from "../extraction/source/hair-dyeing/inputs.ts";
import { resolveDyeingIcon } from "../extraction/source/hair-dyeing/icons.ts";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("\\", "/")
    .replace(/\.(png|jpe?g|tga|psd)$/, "");
const identity = (object: Pick<ImageObject, "packageSha256" | "assetType" | "pathId">) =>
  digest({
    packageSha256: object.packageSha256,
    assetType: object.assetType,
    pathId: object.pathId,
  });

function configuredReferences(
  need: ImageNeed,
  observations: ClientReadRecords,
  tables: Tables,
  source: string,
  dyeingIcons: ReadonlyMap<string, string | null>,
): string[] {
  const { owner } = need;
  if (owner.kind === "hairColorGroup" || owner.kind === "hairColorBlock") {
    const key = `${owner.kind}:${owner.id}`;
    assert.ok(
      dyeingIcons.has(key) && owner.field === "icon",
      `Independent dyeing image owner ${need.id}`,
    );
    const reference = dyeingIcons.get(key);
    return reference ? [reference] : [];
  }
  if (owner.kind === "vignette") {
    const row = tables.byId(291).get(owner.id);
    assert.ok(row && owner.field === "illustration", `Independent vignette image owner ${need.id}`);
    const reference = tables.string(row, 3);
    assert.ok(reference, `Missing vignette image reference ${need.id}`);
    return [reference];
  }
  if (owner.kind === "inspoBox" || owner.field === "front.background") {
    if (owner.kind === "item" && tables.uint(tables.byId(318).get(owner.id), 2) === 300) {
      assert.deepEqual(need.sources, [
        {
          kind: "asset",
          file: "PetitPlanet_Data/Persistent/AssetBundle/blocks/00/00000003.blk",
          pathId: "9104971417108201751",
        },
      ]);
      return ["UISprite/Load/Cooking/Bg_Cooking_Parket_Icon_Normal"];
    }
    const [root, field] = owner.kind === "inspoBox" ? [180, 11] : [568, 9];
    const row = tables.rows(root).find((entry) => tables.id(entry) === owner.id);
    assert.ok(row, `Independent crafting image owner ${need.id}`);
    const value = tables.string(row, field);
    return value ? [value] : [];
  }
  if (owner.kind.startsWith("starsea")) {
    const [root, field] =
      owner.kind === "starseaRegion"
        ? [652, 13]
        : owner.kind === "starseaIslet"
          ? [654, 27]
          : [628, 2];
    const row = tables.rows(root).find((entry) => tables.id(entry) === owner.id);
    assert.ok(row, `Independent starsea image owner ${need.id}`);
    const value = tables.string(row, field)?.trim().replaceAll("\\", "/");
    return value ? [value] : [];
  }
  if (owner.kind !== "neighbor") {
    const record = observations.diagnostics.collection.items.find((entry) => entry.id === owner.id);
    if (owner.kind === "collection" && record?.kind === "series") return [];
    const row = tables.rows(325).find((row) => tables.id(row) === owner.id);
    return [5, 4].flatMap((field) => {
      const value = tables.string(row, field);
      return value ? [value] : [];
    });
  }
  const [field, key, , paragraph] = owner.field.split(".");
  if (field === "images") {
    const selections = readJson<{ npcId: number; category: string; resourceName: string }[]>(
      path.join(source, "additional-images.json"),
    );
    return selections
      .filter((entry) => entry.npcId === owner.id && entry.category === key)
      .map((entry) => entry.resourceName);
  }
  let value: string | null = null;
  if (field === "stars") {
    const row = tables
      .rows(630)
      .find(
        (row) =>
          `${tables.uint(row, 5)}:${tables.uint(row, 0)}:${tables.uint(row, 2)}:${tables.uint(row, 3)}` ===
          key,
      );
    assert.ok(row, `Independent star image owner ${need.id}`);
    value = tables.string(row, 15);
  } else if (field === "house") {
    const stageId = Number(owner.field.split(".")[2]);
    const row = tables.rows(315).find((row) => tables.id(row) === stageId);
    assert.ok(row, `Independent house image owner ${need.id}`);
    value = tables.string(row, 21);
  } else if (field === "stories") {
    const rows = tables
      .rows(668)
      .filter((row) => tables.uint(row, 0) === owner.id && tables.uint(row, 1) === Number(key))
      .sort((a, b) => tables.uint(a, 3, 0) - tables.uint(b, 3, 0));
    const row = rows[Number(paragraph)];
    assert.ok(row, `Independent story image owner ${need.id}`);
    value = tables.string(row, 5);
  } else throw new Error(`Unknown image owner ${need.id}`);
  return value ? [value.replaceAll("\\", "/")] : [];
}

export function verifyImages(
  directory: string,
  tables: Tables,
  observations: ClientReadRecords,
  originals: OriginalImage[],
  bindings: ImageBinding[],
): void {
  const source = path.join(directory, "source");
  const index = readJson<IndexedAsset[]>(path.join(source, "prepared/asset-index.json"));
  const sourceFiles = dyeingSourceFiles(source);
  const dyeingIcons = new Map<string, string | null>();
  if (sourceFiles.length) {
    const { groups, blocks } = readDyeingInputs(source, index);
    for (const { id, iconPath } of groups.value.colorGroups)
      dyeingIcons.set(`hairColorGroup:${id}`, iconPath);
    for (const { id, iconPath } of blocks.value.colorBlocks)
      dyeingIcons.set(`hairColorBlock:${id}`, iconPath);
  }
  const packages = new Map(
    readJson<{ source: string; sha256: string }[]>(path.join(source, "packages.json")).map(
      (entry) => [entry.source, entry.sha256],
    ),
  );
  const snapshotFiles = readJson<{ path: string; sha256: string }[]>(
    path.join(source, "client-files.json"),
  );
  const snapshot = new Map(snapshotFiles.map((file) => [file.path, file.sha256]));
  for (const [file, sha256] of packages)
    assert.equal(
      sha256,
      snapshot.get(file),
      "Package identity comes from frozen snapshot inventory",
    );
  const audit = readJson<SourceAudit>(path.join(directory, "source-audit.json"));
  assert.equal(audit.passed, true);
  const bindata = readJson<BinDataAsset[]>(path.join(source, "bindata-manifest.json"));
  const expectedPackages = [
    ...new Set([
      ...observations.imageObjects.map((object) => object.source),
      ...bindata.map((asset) => asset.Source),
      ...sourceFiles,
    ]),
  ].sort();
  assert.deepEqual(
    audit.records.map((entry) => entry.source).sort(),
    expectedPackages,
    "Every participating candidate package is audited",
  );
  assert.ok([...audit.records, ...audit.configChecks].every((entry) => entry.matchesManifest));
  const exactLocators = new Map<string, Set<string>>();
  const byContainer = new Map<string, IndexedAsset[]>();
  const bySpriteFolderAndName = new Map<string, IndexedAsset[]>();
  for (const entry of index) {
    const locator = JSON.stringify([entry.Source, entry.Type, entry.Name, entry.Container]);
    const ids = exactLocators.get(locator) ?? new Set<string>();
    ids.add(entry.PathID);
    exactLocators.set(locator, ids);
    if (entry.Container) {
      const container = `${entry.Type}:${normalize(entry.Container)}`;
      const entries = byContainer.get(container) ?? [];
      entries.push(entry);
      byContainer.set(container, entries);
      if (entry.Type === "Sprite" && entry.Name) {
        const folder = normalize(entry.Container).split("/").slice(0, -1).join("/");
        const spriteKey = `${folder}/${normalize(entry.Name)}`;
        const siblings = bySpriteFolderAndName.get(spriteKey) ?? [];
        siblings.push(entry);
        bySpriteFolderAndName.set(spriteKey, siblings);
      }
    }
  }
  const objects = new Map<string, ImageObject>();
  for (const object of observations.imageObjects) {
    assert.match(object.pathId, /^(?:0|-?[1-9]\d*)$/);
    assert.ok(BigInt(object.pathId) >= -(2n ** 63n) && BigInt(object.pathId) < 2n ** 63n);
    assert.equal(object.packageSha256, packages.get(object.source));
    assert.equal(object.key, identity(object));
    const exact = exactLocators.get(
      JSON.stringify([object.source, object.assetType, object.resourceName, object.container]),
    );
    assert.deepEqual(exact ? [...exact] : [], [object.pathId], "Unambiguous exporter locator");
    const previous = objects.get(object.key);
    if (previous)
      for (const key of ["container", "resourceName", "assetType"] as const)
        assert.equal(object[key], previous[key], "Conflicting aliases");
    objects.set(object.key, object);
  }
  assert.deepEqual(
    originals.map((entry) => entry.object).sort(),
    [...objects.keys()].sort(),
    "All candidate originals retained",
  );
  const byObject = new Map(originals.map((entry) => [entry.object, entry]));
  for (const original of originals) {
    assert.equal(original.file, `originals/${original.sha256}.png`);
    const bytes = fs.readFileSync(within(directory, original.file));
    assert.equal(digest(bytes), original.sha256, "PNG content identity");
    const png = PNG.sync.read(bytes, { checkCRC: true });
    assert.equal(png.data.length, png.width * png.height * 4);
    assert.deepEqual(
      [png.width, png.height],
      [original.width, original.height],
      "Decoded original dimensions",
    );
  }
  const resolved = (reference: string, allowAtlasName: boolean): IndexedAsset | undefined => {
    const key = normalize(`assets/moleres/rel/sres/${reference}`);
    const preferred = (entries: IndexedAsset[]) => {
      const overlays = entries.filter((entry) => /(?:^|\/)Persistent\//i.test(entry.Source));
      const active = overlays.length ? overlays : entries;
      assert.ok(
        new Set(active.map((entry) => `${entry.Source}:${entry.PathID}`)).size <= 1,
        `Ambiguous exact configuration ${reference}`,
      );
      return active[0];
    };
    const texture = preferred(byContainer.get(`Texture2D:${key}`) ?? []);
    if (texture && !texture.Name?.startsWith("sactx-")) return texture;
    const sprite = preferred(
      (byContainer.get(`Sprite:${key}`) ?? []).filter(
        (entry) => entry.Name && normalize(entry.Name) === normalize(reference.split("/").at(-1)!),
      ),
    );
    return sprite ?? (allowAtlasName ? preferred(bySpriteFolderAndName.get(key) ?? []) : undefined);
  };
  const expectedBindings: ImageBinding[] = [];
  const candidateKeys = new Set(
    neighborImageSlots(observations.neighborImages).map((slot) => slot.object),
  );
  for (const { image } of clientIconSlots(observations.clientIcons)) {
    if (!image) continue;
    const key = normalize(`assets/moleres/rel/sres/${image.reference}`);
    const name = key.split("/").at(-1);
    const exact = (byContainer.get(`Sprite:${key}`) ?? []).filter(
      (asset) => asset.Name?.toLowerCase() === name,
    );
    const siblings = bySpriteFolderAndName.get(key) ?? [];
    const atlas = clientIconAtlas(image.reference);
    const members = atlas
      ? (byContainer.get(`Sprite:${normalize(atlas)}`) ?? []).filter(
          (asset) => asset.Name?.toLowerCase() === name,
        )
      : [];
    const matches = exact.length ? exact : siblings.length ? siblings : members;
    assert.equal(
      image.method,
      exact.length
        ? "exact_config_path"
        : siblings.length
          ? "unique_sprite_name"
          : "configured_atlas_member",
    );
    const overlay = matches.filter((entry) => entry.Source.includes("/Persistent/"));
    const active = overlay.length ? overlay : matches;
    const entry = active[0];
    assert.ok(
      entry && new Set(active.map((asset) => `${asset.Source}:${asset.PathID}`)).size === 1,
      `Unique client sprite ${image.reference}`,
    );
    const packageSha256 = packages.get(entry.Source);
    assert.ok(packageSha256);
    assert.equal(
      image.object,
      identity({ packageSha256, assetType: "Sprite", pathId: entry.PathID }),
      image.reference,
    );
    candidateKeys.add(image.object);
  }
  const craftingIconIds = new Set(
    observations.catalog.items.flatMap((item) =>
      item.kind === "inspoCard"
        ? [item.id, item.recipe.productId]
        : item.kind === "cookingRecipeItem"
          ? [item.id]
          : [],
    ),
  );
  const paymentIds = new Set(
    observations.catalog.purchaseOffers.map((offer) => offer.currencyItemId),
  );
  const currencyUses = new Set<string>();
  for (const item of observations.catalog.items) {
    if (item.kind !== "reference") continue;
    const use = `item:${item.id}:image`;
    if (paymentIds.has(item.id)) {
      assert.deepEqual(item.image, { use }, `Currency image owner ${item.id}`);
      currencyUses.add(use);
    } else assert.equal(item.image, null, `Reference image scope ${item.id}`);
  }
  for (const need of observations.imageNeeds) {
    const record = observations.diagnostics.collection.items.find(
      (entry) => entry.id === need.owner.id,
    );
    const variant =
      need.owner.field === "front.background"
        ? "card-background"
        : need.owner.kind === "neighbor" ||
            need.owner.kind === "inspoBox" ||
            need.owner.kind === "starseaRegion" ||
            need.owner.kind === "vignette" ||
            need.owner.kind === "starseaIslet"
          ? "illustration"
          : need.owner.kind === "collection" &&
              record?.category === "furniture" &&
              record.kind === "set"
            ? "banner"
            : "icon";
    assert.equal(need.variant, variant, `Independent image variant ${need.id}`);
    let references = configuredReferences(need, observations, tables, source, dyeingIcons);
    const currency = currencyUses.delete(need.id);
    if (currency) {
      assert.deepEqual(need.owner, { kind: "item", id: need.owner.id, field: "image" });
      const rows = tables.rows(325).filter((row) => tables.id(row) === need.owner.id);
      const paths = (row: (typeof rows)[number] | undefined) => [
        ...new Set([4, 5].flatMap((field) => tables.string(row, field) || [])),
      ];
      references = paths(rows[0]);
      for (const row of rows) assert.deepEqual(paths(row), references, "Consistent currency icons");
      assert.deepEqual(
        need.sources,
        rows.length
          ? rows.map((row) => ({
              kind: "table",
              file: "prepared/ed.obb",
              table: 325,
              rowOffset: row.rowOffset,
              fields: [0, 4, 5],
            }))
          : [{ kind: "tableScan", file: "prepared/ed.obb", table: 325 }],
        `Currency image provenance ${need.id}`,
      );
    }
    const dyeing = need.owner.kind === "hairColorGroup" || need.owner.kind === "hairColorBlock";
    if (dyeing)
      assert.equal(need.required, references.length > 0, `Required dyeing icon ${need.id}`);
    if (
      need.owner.kind === "item" &&
      need.owner.field === "image" &&
      craftingIconIds.has(need.owner.id)
    )
      references = references.filter(
        (reference) => normalize(reference.trim()) !== "uisprite/load/item/cloud",
      );
    if (need.owner.field === "front.background")
      assert.equal(need.required, true, `Required card background ${need.id}`);
    if (need.owner.kind === "vignette")
      assert.equal(need.required, true, `Required vignette illustration ${need.id}`);
    let placeholderOnly = false;
    if (need.owner.kind === "neighborOutfit") {
      references = references.filter((reference) => reference.trim());
      assert.ok(references.length, `Missing neighbor clothing icon configuration ${need.id}`);
      const selected = references.find(
        (reference) => normalize(reference.trim()) !== "uisprite/load/item/cloud",
      );
      placeholderOnly = selected === undefined;
      if (selected !== undefined) references = [selected];
      assert.equal(
        need.required,
        !placeholderOnly,
        `Independent outfit image requirement ${need.id}`,
      );
      assert.equal(
        need.reason,
        placeholderOnly ? "neighbor_clothing_placeholder_icon" : "configured_resource_missing",
        `Independent outfit image reason ${need.id}`,
      );
    }
    assert.deepEqual(need.references, references, `Independent image configuration ${need.id}`);
    const additional = need.owner.kind === "neighbor" && need.owner.field.startsWith("images.");
    // 支付物品选首个可定位的配置，小图优先于大图。
    const eligible = currency
      ? references.slice(
          0,
          references.findIndex((ref) => ref.startsWith("UISprite/") && resolved(ref, true)) + 1,
        )
      : references;
    const candidates = eligible.flatMap((reference, rank) => {
      if (placeholderOnly) return [];
      if (dyeing) {
        const asset = resolveDyeingIcon(index, reference);
        return [
          {
            reference,
            rank,
            object: identity({
              ...asset,
              assetType: "Sprite",
              packageSha256: packages.get(asset.source)!,
            }),
          },
        ];
      }
      if (additional) {
        const selections = readJson<
          {
            npcId: number;
            category: string;
            source: string;
            assetType: "Sprite" | "Texture2D";
            pathId: string;
          }[]
        >(path.join(source, "additional-images.json"));
        const selection = selections.find(
          (entry) =>
            entry.npcId === need.owner.id && `images.${entry.category}` === need.owner.field,
        )!;
        const packageSha256 = packages.get(selection.source)!;
        return [{ reference, rank, object: identity({ ...selection, packageSha256 }) }];
      }
      if (!reference.startsWith("UISprite/")) return [];
      const asset = resolved(
        reference,
        currency || need.owner.kind.startsWith("starsea") || variant === "card-background",
      );
      if (variant === "card-background" && need.sources[0]?.kind === "asset") {
        assert.equal(asset?.Type, "Sprite");
        assert.equal(asset.Name, "Bg_Cooking_Parket_Icon_Normal");
        assert.equal(asset.Source, need.sources[0].file);
        assert.equal(asset.PathID, need.sources[0].pathId);
      }
      return asset
        ? [
            {
              reference,
              rank,
              object: identity({
                packageSha256: packages.get(asset.Source)!,
                assetType: asset.Type as ImageObject["assetType"],
                pathId: asset.PathID,
              }),
            },
          ]
        : [];
    });
    assert.deepEqual(need.candidates, candidates, `Complete authoritative candidates ${need.id}`);
    for (const candidate of candidates) candidateKeys.add(candidate.object);
    const ordered = [...candidates].sort((a, b) => {
      const left = byObject.get(a.object)!;
      const right = byObject.get(b.object)!;
      return (
        right.width * right.height - left.width * left.height ||
        a.rank - b.rank ||
        (a.object < b.object ? -1 : a.object > b.object ? 1 : 0)
      );
    });
    assert.ok(ordered.length || !need.required, `Required image ${need.id}`);
    expectedBindings.push({
      use: need.id,
      object: ordered[0]?.object ?? null,
      reason: ordered.length ? null : need.reason,
    });
  }
  assert.equal(currencyUses.size, 0, "Every payment reference has an image lookup");
  assert.deepEqual(
    [...objects.keys()].sort(),
    [...candidateKeys].sort(),
    "Exact participating source objects",
  );
  assert.deepEqual(
    bindings,
    expectedBindings.sort((a, b) => a.use.localeCompare(b.use)),
    "Independent resolution/area/rank selection",
  );
}
