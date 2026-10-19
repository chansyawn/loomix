import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { PNG } from "pngjs";
import { ObbReader } from "./obb-reader.mjs";
import { getConfigFile, activeConfigSource } from "./game-resource-paths.mjs";
const { out } = getPaths(),
  dest = `${out}/catalog`;
const data = JSON.parse(fs.readFileSync(`${dest}/items.json`)),
  items = data.items;
const icons = JSON.parse(fs.readFileSync(`${dest}/icon-manifest.json`));
const byId = new Map(items.map((i) => [i.id, i]));
assert.equal(byId.size, items.length);
assert.equal(items.length, profile.expected.records);
assert.equal(icons.length, profile.expected.icons);
assert.equal(items.filter((i) => i.iconFile).length, profile.expected.itemsWithIcon);
const types = new Map(JSON.parse(fs.readFileSync(`${dest}/types.json`)).map((t) => [t.id, t]));
for (const i of items) {
  assert.ok(i.nameZh);
  assert.equal(types.get(i.typeId)?.name, i.typeName);
}
// 通过独立的文件名与数据表证据确认的游戏内标签。
const samples = profile.expected.samples;
for (const [id, name] of Object.entries(samples)) {
  assert.equal(byId.get(Number(id)).nameZh, name);
  assert.ok(byId.get(Number(id)).iconFile);
}
assert.equal(
  byId.get(profile.expected.prefixCollisionItem).nameZh,
  profile.expected.prefixCollisionName,
);
assert.equal(byId.get(16).iconSmall.reference, profile.expected.prefixCollisionIcon);
const creatures = JSON.parse(
  fs.readFileSync(`${out}/decoded-tables/${profile.roots.creatures}.json`),
).rows;
let creatureChecks = 0;
const creatureLabelDifferences = [];
for (const row of creatures) {
  const i = byId.get(row.words[profile.fields.creatures.id]);
  if (i && row.texts[profile.fields.creatures.name]) {
    if (i.nameHash === row.texts[1].hash) assert.equal(i.nameZh, row.texts[1].zh);
    if (i.nameZh === row.texts[1].zh) creatureChecks++;
    else if (i.nameZh !== row.texts[1].zh)
      creatureLabelDifferences.push({
        id: i.id,
        itemName: i.nameZh,
        galleryName: row.texts[1].zh,
        itemNameHash: i.nameHash,
        galleryNameHash: row.texts[1].hash,
      });
  }
}
assert.ok(creatureChecks > 250);
const reader = new ObbReader(getConfigFile("ed.obb"));
const koi = creatures.find(
    (r) => r.words[profile.fields.creatures.id] === profile.expected.longStringItem,
  ),
  fields = reader.fields(koi.rowOffset),
  long = reader.string(fields[profile.fields.creatures.description]);
assert.ok(long.length > 256);
assert.ok(long.text.startsWith(profile.expected.longStringStart));
assert.ok(long.text.endsWith(profile.expected.longStringEnd));
// 此前通过此奇数长度的主题图标路径发现了镜像掩码的中心位置错误。
const theme = byId.get(profile.expected.oddStringItem),
  themeFields = reader.fields(theme.source.uiRowOffset);
assert.equal(
  reader.string(themeFields[profile.fields.ui.smallIcon]).text,
  profile.expected.oddString,
);
assert.equal(Buffer.byteLength(theme.iconSmall.reference) % 2, 1);
for (const icon of icons) {
  const bytes = fs.readFileSync(`${dest}/${icon.file}`);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), icon.width);
  assert.equal(bytes.readUInt32BE(20), icon.height);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), icon.sha256);
  assert.ok(icon.width > 0 && icon.height > 0);
  const decoded = PNG.sync.read(bytes, { checkCRC: true });
  assert.equal(decoded.width, icon.width);
  assert.equal(decoded.height, icon.height);
}
const audit = JSON.parse(fs.readFileSync(`${dest}/icon-source-audit.json`));
assert.equal(audit.passed, true);
assert.equal(audit.checkedBundles, profile.expected.iconBundles);
assert.equal(types.size, profile.expected.types);
const db = new DatabaseSync(`${dest}/petit-planet.sqlite`, { readOnly: true });
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM items").get().n, items.length);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM icons").get().n, icons.length);
assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
for (const [id, name] of Object.entries(samples))
  assert.equal(db.prepare("SELECT name_zh FROM items WHERE id=?").get(Number(id)).name_zh, name);
db.close();
assert.ok(activeConfigSource().files.every((f) => f.matchesManifest));
const result = {
  passed: true,
  records: items.length,
  uniqueIds: byId.size,
  allChineseNamesPresent: true,
  allPrimaryTypesJoined: true,
  knownLabelChecks: Object.keys(samples).length,
  creatureCrossTableChecks: creatureChecks,
  creatureLabelDifferences,
  longStringBytes: long.length,
  oddStringBytes: Buffer.byteLength(theme.iconSmall.reference),
  validatedPngFiles: icons.length,
  sqliteIntegrity: "ok",
  foreignKeyViolations: 0,
  sourceRevision: data.configRevision,
  pngsFullyDecoded: icons.length,
};
fs.writeFileSync(`${dest}/validation.json`, JSON.stringify(result, null, 2));
fs.writeFileSync(
  `${dest}/png-validation.json`,
  JSON.stringify({ passed: true, pngsFullyDecodedWithPngjs: icons.length }, null, 2),
);
console.log(JSON.stringify(result, null, 2));
