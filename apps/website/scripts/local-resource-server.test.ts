import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { localResourceMiddleware } from "./local-resource-server.ts";

test("serves WebP resources with the correct MIME type for GET and HEAD", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "loomix-resource-server-"));
  const key = `assets/${"a".repeat(64)}.webp`;
  const bytes = Buffer.from("webp response fixture");
  const middleware = localResourceMiddleware(directory);
  const server = createServer((request, response) => {
    middleware(request, response, () => response.writeHead(404).end());
  });
  try {
    await mkdir(path.join(directory, "assets"));
    await writeFile(path.join(directory, key), bytes);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server address");
    const base = `http://127.0.0.1:${address.port}/resources/`;
    const response = await fetch(base + key);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    const head = await fetch(base + key, { method: "HEAD" });
    expect(head.headers.get("content-type")).toBe("image/webp");
    expect(head.headers.get("content-length")).toBe(String(bytes.length));
    expect(await head.text()).toBe("");
    expect((await fetch(base + key.replace(".webp", ".png"))).status).toBe(404);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    await rm(directory, { recursive: true, force: true });
  }
});
