import { createIconResolver } from "./icon-resolver.mjs";
import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import { activeConfigSource } from "./game-resource-paths.mjs";
const { out } = getPaths();
const read = (i) => JSON.parse(fs.readFileSync(`${out}/decoded-tables/${i}.json`)).rows;
const main = read(profile.roots.items),
  ui = read(profile.roots.ui),
  typeRows = read(profile.roots.types);
const types = new Map(
  typeRows.map((r) => [
    r.words[profile.fields.types.id],
    {
      id: r.words[profile.fields.types.id],
      name: r.strings[profile.fields.types.name],
      source: { rootField: profile.roots.types, rowOffset: r.rowOffset },
    },
  ]),
);
const uiById = new Map(ui.map((r) => [r.words[profile.fields.ui.id], r]));
const textures = JSON.parse(fs.readFileSync(`${out}/textures.json`));
const sprites = JSON.parse(fs.readFileSync(`${out}/sprites.json`));
const resolveIcon = createIconResolver(textures, sprites);
const catalogs = [];
for (const r of main) {
  const id = r.words[profile.fields.items.id],
    u = uiById.get(id),
    name = r.texts[profile.fields.items.name],
    type = types.get(r.words[profile.fields.items.type]);
  if (!name || !type) throw new Error(`Unresolved name/type ${id}`);
  const iconSmall = resolveIcon(u?.strings[profile.fields.ui.smallIcon]),
    iconLarge = resolveIcon(u?.strings[profile.fields.ui.largeIcon]);
  catalogs.push({
    id,
    nameZh: name.zh,
    nameEn: name.en,
    nameHash: name.hash,
    typeId: type.id,
    typeName: type.name,
    secondaryTypeId: r.words[profile.fields.items.secondaryType] ?? null,
    categoryTags: r.strings[profile.fields.items.category] ?? null,
    searchTags: r.strings[profile.fields.items.search] ?? null,
    descriptionZh: u?.texts[profile.fields.ui.description]?.zh ?? null,
    descriptionEn: u?.texts[profile.fields.ui.description]?.en ?? null,
    iconSmall,
    iconLarge,
    source: {
      config: activeConfigSource().relativeDirectory + "/ed.obb",
      itemRootField: profile.roots.items,
      itemRowOffset: r.rowOffset,
      uiRootField: u ? profile.roots.ui : null,
      uiRowOffset: u?.rowOffset ?? null,
      textmapRootField: profile.roots.textmap,
      typeRootField: profile.roots.types,
    },
    availability: "unknown",
  });
}
const metadata = {
  status: "resolved_basic_fields",
  gameVersion: profile.gameVersion,
  configRevision: activeConfigSource().dataRevision,
  configSource: activeConfigSource(),
  versionScope:
    "Config pair verified against latest local patch manifest; not a statement about the latest online client",
  notes: [
    "Name and type are joined through decoded config references",
    "Icon matching uses exact config paths; filename ID prefixes are not used",
    "Config type names may be internal authoring labels; categoryTags preserve client strings",
    "These records include sets, scene entities, NPC items, quest objects and test content; obtainability is unknown",
    "UI fields 4/5 and main fields 0/1/2 have been identified by cross-table evidence, full generated schema is still unavailable",
  ],
  items: catalogs,
};
fs.writeFileSync(`${out}/resolved-items.json`, JSON.stringify(metadata, null, 2));
fs.writeFileSync(`${out}/resolved-types.json`, JSON.stringify([...types.values()], null, 2));
const quote = (s) => '"' + String(s ?? "").replaceAll('"', '""') + '"';
fs.writeFileSync(
  `${out}/resolved-items.csv`,
  "\uFEFFid,name_zh,name_en,type_id,type_name,category_tags,search_tags,description_zh,icon_small,icon_large,small_matched,large_matched,availability\r\n" +
    catalogs
      .map((r) =>
        [
          r.id,
          r.nameZh,
          r.nameEn,
          r.typeId,
          r.typeName,
          r.categoryTags,
          r.searchTags,
          r.descriptionZh,
          r.iconSmall?.reference,
          r.iconLarge?.reference,
          r.iconSmall?.matched ?? false,
          r.iconLarge?.matched ?? false,
          r.availability,
        ]
          .map(quote)
          .join(","),
      )
      .join("\r\n"),
);
const summary = {
  records: catalogs.length,
  namesZh: catalogs.filter((x) => x.nameZh).length,
  typesResolved: catalogs.length,
  typeDefinitions: types.size,
  withUi: catalogs.filter((x) => x.source.uiRowOffset).length,
  withDescription: catalogs.filter((x) => x.descriptionZh).length,
  withSmallReference: catalogs.filter((x) => x.iconSmall).length,
  withLargeReference: catalogs.filter((x) => x.iconLarge).length,
  withMatchedSmall: catalogs.filter((x) => x.iconSmall?.matched).length,
  withMatchedLarge: catalogs.filter((x) => x.iconLarge?.matched).length,
  withAnyMatchedIcon: catalogs.filter((x) => x.iconSmall?.matched || x.iconLarge?.matched).length,
  typeCounts: [...types.values()]
    .map((t) => ({
      id: t.id,
      name: t.name,
      count: catalogs.filter((x) => x.typeId === t.id).length,
    }))
    .filter((t) => t.count)
    .sort((a, b) => b.count - a.count),
};
const unmatched = catalogs
  .flatMap((x) =>
    ["Small", "Large"].map((kind) => ({
      id: x.id,
      nameZh: x.nameZh,
      typeName: x.typeName,
      kind,
      reference: x["icon" + kind]?.reference ?? null,
      reason: x["icon" + kind]
        ? x["icon" + kind].matched
          ? null
          : "config_path_not_in_texture_index"
        : x.source.uiRowOffset
          ? "no_reference"
          : "no_ui_record",
    })),
  )
  .filter((x) => x.reason);
fs.writeFileSync(`${out}/unmatched-icons.json`, JSON.stringify(unmatched, null, 2));
fs.writeFileSync(`${out}/resolved-summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, typeCounts: summary.typeCounts.slice(0, 22) }, null, 2));
