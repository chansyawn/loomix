import fs from "node:fs";
import path from "node:path";
import { version, patchFile } from "./config.mjs";
import { download, unpack } from "./download.mjs";

async function installDotnet(kind, destination, { rid, platform, run, fetchFile, extract }) {
  const pinned = kind === "sdk" ? version.sdk : version.runtime;
  const executable = path.join(destination, platform === "win32" ? "dotnet.exe" : "dotnet");
  const marker =
    kind === "sdk"
      ? path.join(destination, "sdk", pinned, "dotnet.dll")
      : path.join(
          destination,
          "shared/Microsoft.NETCore.App",
          pinned,
          "System.Private.CoreLib.dll",
        );
  if (fs.existsSync(executable) && fs.existsSync(marker)) return executable;
  const response = await fetch(
    "https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json",
    {
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Unable to read .NET release metadata (${response.status})`);
  const metadata = await response.json();
  const release = metadata.releases.find((entry) => entry[kind]?.version === pinned);
  const suffix = platform === "win32" ? ".zip" : ".tar.gz";
  const file = release?.[kind].files.find(
    (entry) => entry.rid === rid && entry.name.endsWith(suffix),
  );
  if (!file) throw new Error(`No pinned .NET ${kind} ${pinned} for ${rid}`);
  const archive = `${destination}${suffix}`;
  await fetchFile(file.url, archive, { hash: file.hash, algorithm: "sha512" });
  fs.rmSync(destination, { recursive: true, force: true });
  await extract(archive, destination, { platform, run });
  fs.rmSync(archive);
  if (!fs.existsSync(executable) || !fs.existsSync(marker))
    throw new Error(`Incomplete .NET ${kind}: ${destination}`);
  return executable;
}

export async function preparePlatform({
  directory,
  work,
  rid,
  platform,
  run,
  fetchFile = download,
  extract = unpack,
}) {
  if (platform === "win32") {
    const archive = path.join(work, "animestudio.zip");
    await fetchFile(version.windows.url, archive, { hash: version.windows.sha256 });
    const unpacked = path.join(work, "unpacked");
    await extract(archive, unpacked, { platform, run });
    const root = path.join(unpacked, `AnimeStudio-net10-${version.revision}`);
    fs.renameSync(root, path.join(directory, "cli"));
    await installDotnet("runtime", path.join(directory, "runtime"), {
      rid,
      platform,
      run,
      fetchFile,
      extract,
    });
    return;
  }
  const source = path.join(work, "source");
  await run("git", ["init", source]);
  await run("git", [
    "-C",
    source,
    "remote",
    "add",
    "origin",
    "https://github.com/Escartem/AnimeStudio.git",
  ]);
  await run("git", ["-C", source, "fetch", "--depth", "1", "origin", version.revision]);
  await run("git", ["-C", source, "checkout", "--detach", "FETCH_HEAD"]);
  await run("git", ["-C", source, "apply", "--check", patchFile]);
  await run("git", ["-C", source, "apply", patchFile]);
  const sdk = await installDotnet("sdk", path.join(work, "sdk"), {
    rid,
    platform,
    run,
    fetchFile,
    extract,
  });
  await run(
    sdk,
    [
      "publish",
      path.join(source, "AnimeStudio.CLI/AnimeStudio.CLI.csproj"),
      "--configuration",
      "Release",
      "--framework",
      "net10.0",
      "--runtime",
      rid,
      "--self-contained",
      "true",
      "-p:TargetFrameworks=net10.0",
      "--output",
      path.join(directory, "cli"),
    ],
    { env: { DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1" } },
  );
}
