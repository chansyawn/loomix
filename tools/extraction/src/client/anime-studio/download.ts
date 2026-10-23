import type { DownloadOptions, UnpackOptions } from "./types.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export async function download(
  url: string,
  destination: string,
  { hash, algorithm = "sha256" }: DownloadOptions,
) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const partial = `${destination}.${crypto.randomUUID()}.partial`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15 * 60_000) });
    if (!response.ok || !response.body)
      throw new Error(
        `Download failed (${response.status}): ${url}; pinned build artifacts may have expired`,
      );
    const digest = crypto.createHash(algorithm);
    await pipeline(
      Readable.fromWeb(response.body),
      new Transform({
        transform(chunk, _encoding, callback) {
          digest.update(chunk);
          callback(null, chunk);
        },
      }),
      fs.createWriteStream(partial, { flags: "wx" }),
    );
    if (digest.digest("hex") !== hash.toLowerCase()) throw new Error(`Checksum mismatch: ${url}`);
    fs.renameSync(partial, destination);
  } finally {
    fs.rmSync(partial, { force: true });
  }
}

export async function unpack(
  archive: string,
  destination: string,
  { platform, run }: UnpackOptions,
) {
  fs.mkdirSync(destination, { recursive: true });
  if (platform === "win32") {
    // 通过环境传递路径，避免把本地路径插入 PowerShell 代码。
    await run(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath $env:ANIMESTUDIO_ARCHIVE -DestinationPath $env:ANIMESTUDIO_DESTINATION",
      ],
      { env: { ANIMESTUDIO_ARCHIVE: archive, ANIMESTUDIO_DESTINATION: destination } },
    );
  } else {
    await run("tar", ["-xzf", archive, "-C", destination]);
  }
}
