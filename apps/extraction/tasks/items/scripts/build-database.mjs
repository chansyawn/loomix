import { getPaths } from "./config.mjs";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const { out, baseline: baselineFile } = getPaths(),
  dest = `${out}/catalog`;
const source = JSON.parse(fs.readFileSync(`${out}/resolved-items.json`));
const types = JSON.parse(fs.readFileSync(`${out}/resolved-types.json`));
const icons = JSON.parse(fs.readFileSync(`${dest}/icon-manifest.json`));
const iconKey = (i) => `${i.source}|${i.pathId}`;
const byKey = new Map(icons.map((i) => [iconKey(i), i]));
const items = source.items.map((i) => {
  const icon = byKey.get(iconKey(i.iconSmall ?? {})) ?? byKey.get(iconKey(i.iconLarge ?? {}));
  return {
    ...i,
    iconFile: icon?.file ?? null,
    iconStatus: icon
      ? "exported"
      : i.iconSmall?.matched || i.iconLarge?.matched
        ? "export_failed"
        : i.iconSmall || i.iconLarge
          ? "reference_not_indexed"
          : "no_reference",
  };
});
const { items: _items, ...metadata } = source;
metadata.schemaVersion = 1;
metadata.iconPolicy =
  "Prefer configured small icon, otherwise large icon; use exact path and exact Sprite name for atlas assets";
const db = new DatabaseSync(`${dest}/petit-planet.sqlite`);
db.exec("PRAGMA foreign_keys=ON;");
// 仅允许覆盖此导出器创建的数据库，避免覆盖无关文件。
const appId = db.prepare("PRAGMA application_id").get().application_id;
if (appId !== 0 && appId !== 1347447892) throw new Error("Unexpected database application_id");
if (appId === 0 && db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n)
  throw new Error("Refusing to replace an unowned database");
db.exec(`BEGIN; DROP TABLE IF EXISTS items; DROP TABLE IF EXISTS icons; DROP TABLE IF EXISTS types; DROP TABLE IF EXISTS metadata;
CREATE TABLE metadata (key TEXT PRIMARY KEY,value_json TEXT NOT NULL) STRICT;
CREATE TABLE types (id INTEGER PRIMARY KEY,name TEXT NOT NULL,source_root_field INTEGER NOT NULL,source_row_offset INTEGER NOT NULL) STRICT;
CREATE TABLE icons (asset_key TEXT PRIMARY KEY,reference TEXT NOT NULL,container TEXT NOT NULL,source_file TEXT NOT NULL,path_id TEXT NOT NULL,asset_type TEXT NOT NULL,file TEXT NOT NULL UNIQUE,width INTEGER NOT NULL,height INTEGER NOT NULL,sha256 TEXT NOT NULL) STRICT;
CREATE TABLE items (id INTEGER PRIMARY KEY,name_zh TEXT NOT NULL,name_en TEXT,name_hash INTEGER NOT NULL,type_id INTEGER NOT NULL REFERENCES types(id),secondary_type_id INTEGER,category_tags TEXT,search_tags TEXT,description_zh TEXT,description_en TEXT,small_icon_reference TEXT,large_icon_reference TEXT,icon_asset_key TEXT REFERENCES icons(asset_key),icon_file TEXT,icon_status TEXT NOT NULL,availability TEXT NOT NULL,config_file TEXT NOT NULL,item_root_field INTEGER NOT NULL,item_row_offset INTEGER NOT NULL,ui_root_field INTEGER,ui_row_offset INTEGER) STRICT;
CREATE INDEX items_type_idx ON items(type_id); CREATE INDEX items_name_idx ON items(name_zh);
PRAGMA application_id=1347447892; PRAGMA user_version=1;`);
const insertMeta = db.prepare("INSERT INTO metadata VALUES (?,?)");
for (const [k, v] of Object.entries(metadata)) insertMeta.run(k, JSON.stringify(v));
insertMeta.run("versionAudit", fs.readFileSync(`${out}/version-audit.json`, "utf8"));
const insertType = db.prepare("INSERT INTO types VALUES (?,?,?,?)");
for (const t of types) insertType.run(t.id, t.name, t.source.rootField, t.source.rowOffset);
const insertIcon = db.prepare("INSERT INTO icons VALUES (?,?,?,?,?,?,?,?,?,?)");
for (const i of icons)
  insertIcon.run(
    iconKey(i),
    i.reference,
    i.container,
    i.source,
    i.pathId,
    i.assetType,
    i.file,
    i.width,
    i.height,
    i.sha256,
  );
const insertItem = db.prepare(
  "INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
);
for (const i of items) {
  const icon = byKey.get(iconKey(i.iconSmall ?? {})) ?? byKey.get(iconKey(i.iconLarge ?? {}));
  insertItem.run(
    i.id,
    i.nameZh,
    i.nameEn,
    i.nameHash,
    i.typeId,
    i.secondaryTypeId,
    i.categoryTags,
    i.searchTags,
    i.descriptionZh,
    i.descriptionEn,
    i.iconSmall?.reference ?? null,
    i.iconLarge?.reference ?? null,
    icon ? iconKey(icon) : null,
    i.iconFile,
    i.iconStatus,
    i.availability,
    i.source.config,
    i.source.itemRootField,
    i.source.itemRowOffset,
    i.source.uiRootField,
    i.source.uiRowOffset,
  );
}
db.exec("COMMIT;");
const integrity = db.prepare("PRAGMA integrity_check").all(),
  foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" || foreignKeys.length)
  throw new Error("SQLite integrity check failed");
db.close();
fs.writeFileSync(`${dest}/items.json`, JSON.stringify({ ...metadata, items }, null, 2));
fs.writeFileSync(`${dest}/types.json`, JSON.stringify(types, null, 2));
fs.writeFileSync(
  `${dest}/missing-icons.json`,
  JSON.stringify(
    items
      .filter((i) => !i.iconFile)
      .map((i) => ({
        id: i.id,
        nameZh: i.nameZh,
        typeId: i.typeId,
        typeName: i.typeName,
        iconStatus: i.iconStatus,
        smallReference: i.iconSmall?.reference ?? null,
        largeReference: i.iconLarge?.reference ?? null,
        source: i.source,
      })),
    null,
    2,
  ),
);
const columns = {
  id: "id",
  name_zh: "nameZh",
  name_en: "nameEn",
  type_id: "typeId",
  type_name: "typeName",
  secondary_type_id: "secondaryTypeId",
  category_tags: "categoryTags",
  search_tags: "searchTags",
  description_zh: "descriptionZh",
  description_en: "descriptionEn",
  icon_file: "iconFile",
  icon_status: "iconStatus",
  availability: "availability",
};
const quote = (s) => '"' + String(s ?? "").replaceAll('"', '""') + '"';
fs.writeFileSync(
  `${dest}/items.csv`,
  "\uFEFF" +
    Object.keys(columns).join(",") +
    "\r\n" +
    items
      .map((i) =>
        Object.values(columns)
          .map((k) => quote(i[k]))
          .join(","),
      )
      .join("\r\n"),
);
const summary = {
  ...JSON.parse(fs.readFileSync(`${out}/resolved-summary.json`)),
  uniqueExportedIcons: icons.length,
  itemsWithLocalIcon: items.filter((i) => i.iconFile).length,
  iconStatusCounts: Object.fromEntries(
    [...new Set(items.map((i) => i.iconStatus))].map((s) => [
      s,
      items.filter((i) => i.iconStatus === s).length,
    ]),
  ),
  sqliteIntegrity: "ok",
  sqliteForeignKeyViolations: 0,
};
fs.writeFileSync(`${dest}/summary.json`, JSON.stringify(summary, null, 2));
if (baselineFile) {
  const baselineSource = JSON.parse(fs.readFileSync(baselineFile));
  const baseline = baselineSource.items;
  if (!Array.isArray(baseline)) throw new Error("Baseline must contain an items array");
  const before = new Map(baseline.map((i) => [i.id, i]));
  const fields = [
    "nameZh",
    "nameEn",
    "typeId",
    "secondaryTypeId",
    "categoryTags",
    "searchTags",
    "descriptionZh",
    "descriptionEn",
  ];
  const changes = items.flatMap((i) => {
    const old = before.get(i.id);
    if (!old) return [{ id: i.id, change: "added" }];
    const diff = Object.fromEntries(
      fields.filter((k) => i[k] !== old[k]).map((k) => [k, { before: old[k], after: i[k] }]),
    );
    return Object.keys(diff).length ? [{ id: i.id, nameZh: i.nameZh, fields: diff }] : [];
  });
  const removed = baseline.filter((i) => !items.some((x) => x.id === i.id)).map((i) => i.id);
  fs.writeFileSync(
    `${dest}/version-diff.json`,
    JSON.stringify(
      {
        fromRevision:
          baselineSource.configRevision ?? baselineSource.configSource?.dataRevision ?? null,
        toRevision: source.configRevision,
        beforeCount: baseline.length,
        afterCount: items.length,
        changedCount: changes.length,
        removed,
        changes,
      },
      null,
      2,
    ),
  );
} else {
  fs.rmSync(`${dest}/version-diff.json`, { force: true });
  console.log("Version comparison skipped: no --baseline provided");
}
console.log(JSON.stringify({ ...summary, typeCounts: undefined }, null, 2));
