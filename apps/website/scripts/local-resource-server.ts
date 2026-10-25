import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";

async function serveResource(
  request: IncomingMessage,
  response: ServerResponse,
  directory: string,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent((request.url ?? "").split("?")[0]);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const key = pathname.slice("/resources/".length);
  if (
    key !== "content.json" &&
    key !== "neighbors.json" &&
    !/^assets\/[a-f0-9]{64}\.webp$/.test(key)
  ) {
    response.writeHead(404).end();
    return;
  }
  let file: string;
  let size: number;
  try {
    const base = await realpath(directory);
    file = await realpath(path.join(base, key));
    const relative = path.relative(base, file);
    const info = await stat(file);
    if (path.isAbsolute(relative) || relative.startsWith(`..${path.sep}`) || !info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    size = info.size;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      response.writeHead(404).end();
      return;
    }
    throw error;
  }
  response.writeHead(200, {
    "Content-Type":
      key === "content.json" || key === "neighbors.json"
        ? "application/json; charset=utf-8"
        : "image/webp",
    "Content-Length": size,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") response.end();
  else await pipeline(createReadStream(file), response);
}

export function localResourceMiddleware(
  directory: string,
): (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => void {
  return (request, response, next) => {
    if (!request.url?.startsWith("/resources/")) {
      next();
      return;
    }
    void serveResource(request, response, directory).catch((error: unknown) => {
      if (!response.destroyed) next(error);
    });
  };
}
