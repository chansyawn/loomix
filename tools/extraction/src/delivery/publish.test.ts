import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import { publish, safeOutput } from "./publish.ts";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-publication-"));
  const output = path.join(root, "website"),
    work = path.join(root, "work");
  fs.mkdirSync(path.join(output, "assets"), { recursive: true });
  fs.writeFileSync(path.join(output, ".gitkeep"), "");
  fs.writeFileSync(path.join(output, "content.json"), "old");
  fs.writeFileSync(path.join(output, "assets", "old.png"), "old image");
  fs.mkdirSync(path.join(work, "staging", "assets"), { recursive: true });
  fs.writeFileSync(path.join(work, "staging", "content.json"), "new");
  fs.writeFileSync(path.join(work, "staging", "assets", "new.webp"), "new image");
  fs.writeFileSync(path.join(work, "validation.json"), '{"passed":true}');
  return { root, output, work };
}

test("publication replaces validated deliverables and preserves the placeholder", async () => {
  const options = fixture();
  try {
    let verified = false;
    await publish(options, async (request) => {
      assert.equal(request.work, options.work);
      assert.equal(fs.readFileSync(path.join(options.output, "content.json"), "utf8"), "old");
      verified = true;
    });
    assert.equal(verified, true);
    assert.equal(fs.readFileSync(path.join(options.output, "content.json"), "utf8"), "new");
    assert.deepEqual(fs.readdirSync(path.join(options.output, "assets")), ["new.webp"]);
    assert.deepEqual(fs.readdirSync(options.output).sort(), [".gitkeep", "assets", "content.json"]);
  } finally {
    fs.rmSync(options.root, { recursive: true });
  }
});

test("failed revalidation preserves both previous JSON and assets", async () => {
  const options = fixture();
  try {
    await assert.rejects(
      publish(options, async () => {
        throw new Error("Changed client");
      }),
      /Changed client/,
    );
    assert.equal(fs.readFileSync(path.join(options.output, "content.json"), "utf8"), "old");
    assert.deepEqual(fs.readdirSync(path.join(options.output, "assets")), ["old.png"]);
  } finally {
    fs.rmSync(options.root, { recursive: true });
  }
});

test("output rejects symbolic links in ancestors and unrelated files", () => {
  const options = fixture();
  try {
    const link = path.join(options.root, "alias");
    fs.symlinkSync(options.output, link, "junction");
    assert.throws(() => safeOutput(path.join(link, "new-output")), /link/);
    fs.unlinkSync(link);
    safeOutput(options.output);
    fs.writeFileSync(path.join(options.output, "unexpected.json"), "{}");
    assert.throws(() => safeOutput(options.output), /unrelated/);
  } finally {
    fs.rmSync(options.root, { recursive: true });
  }
});

test("rename failure restores the complete previous delivery", async () => {
  const options = fixture();
  try {
    let calls = 0;
    await assert.rejects(
      publish(
        options,
        async () => {},
        (source, destination) => {
          if (++calls === 2) throw new Error("injected publication failure");
          fs.renameSync(source, destination);
        },
      ),
      /injected/,
    );
    assert.equal(fs.readFileSync(path.join(options.output, "content.json"), "utf8"), "old");
    assert.deepEqual(fs.readdirSync(path.join(options.output, "assets")), ["old.png"]);
    assert.ok(fs.readdirSync(options.root).every((name) => !name.startsWith(".delivery-")));
  } finally {
    fs.rmSync(options.root, { recursive: true });
  }
});
