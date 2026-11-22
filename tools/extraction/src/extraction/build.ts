import fs from "node:fs";
import path from "node:path";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { cacheRoot, identityDirectory } from "../paths.ts";
import { stageInputs, STAGE_MANIFEST_VERSION, verifyStageInputs } from "../workflow/manifest.ts";
import { readVerifiedEnvironment } from "../environment/verify.ts";
import type { Manifest } from "../workflow/manifest.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { implementationRevision, profileHash, toolIdentity } from "../workflow/identity.ts";
import { ensureAnimeStudio } from "../client/anime-studio/index.ts";
import { assertClientUnchanged, clientSnapshotFiles } from "../client/snapshot.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import type { IndexedAsset } from "./types.ts";
import { prepareSource } from "./source/decode.ts";
import { cachedDirectory, copyCachedDirectory } from "./cache.ts";
import { neighborAllowlist } from "./source/neighbors/allowlist.ts";
import { admissionsFile, parseAdmissions } from "./source/catalog/admissions.ts";
import { readClientRecords } from "./source/read-client-records.ts";
import { CLIENT_READ_RECORDS_FILE } from "./files.ts";
import { assemble } from "./assemble/index.ts";
import { exportOriginals } from "./images/originals.ts";
import { audit } from "./audit.ts";
import { verifyExtraction, verifyCandidate } from "./verify.ts";
import { writeAssembly, sealExtraction } from "./bundle.ts";
import { parseVignetteAdmissions } from "./source/vignettes/admissions.ts";
import { vignetteAdmissionsFile } from "./source/vignettes/profile.ts";

export async function extract(environmentId: string): Promise<string> {
  const environmentDirectory = identityDirectory("environments", environmentId);
  const environment = await readVerifiedEnvironment(environmentDirectory);
  if (
    environment.profileHash !== profileHash ||
    environment.tools.animeStudioInput !== digest(toolIdentity())
  )
    throw new Error("Environment profile/tool changed; run init");
  const tool = await ensureAnimeStudio();
  if (environment.tools.animeStudio !== tool)
    throw new Error("Initialized tool bytes changed; run init again");
  await assertClientUnchanged(environment);
  const implementation = await implementationRevision();
  const inputs = await stageInputs(environmentDirectory, environment);
  const admissionsBytes = fs.readFileSync(
    new URL("./source/catalog/supplemental-admissions.json", import.meta.url),
  );
  const admissions = parseAdmissions(admissionsBytes);
  const vignetteBytes = fs.readFileSync(
    new URL("./source/vignettes/admissions.json", import.meta.url),
  );
  const vignetteAdmissions = parseVignetteAdmissions(vignetteBytes);
  const id = digest({
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    formatVersion: FORMAT_VERSION,
    environmentId,
    inputs: inputs.sha256,
    profileHash,
    implementation,
    tool,
    admissions: admissions.sha256,
    vignetteAdmissions: vignetteAdmissions.sha256,
  });
  const destination = identityDirectory("extractions", id);
  await sealExtraction(destination, async (staging) => {
    try {
      const clientSnapshotId = environment.clientSnapshotId;
      const decoded = await cachedDirectory(
        path.join(cacheRoot(), "decode"),
        {
          inputs,
          clientSnapshotId,
          profileHash,
          implementation,
          tool,
          options: "MiHoYoBinData-json",
        },
        async (work) => {
          await prepareSource({
            work,
            environment: environmentDirectory,
            clientSnapshotId,
          });
          fs.rmSync(path.join(work, "logs"), { recursive: true, force: true });
        },
      );
      const source = path.join(staging, "source");
      copyCachedDirectory(decoded, source);
      fs.writeFileSync(path.join(source, admissionsFile), admissionsBytes);
      fs.writeFileSync(path.join(source, vignetteAdmissionsFile), vignetteBytes);
      fs.copyFileSync(
        new URL("./source/neighbors/additional-images.json", import.meta.url),
        path.join(source, "additional-images.json"),
      );
      writeJson(path.join(source, "neighbor-allowlist.json"), neighborAllowlist);
      const snapshotFiles = clientSnapshotFiles(clientSnapshotId);
      writeJson(path.join(source, "client-files.json"), snapshotFiles);
      const files = new Map(snapshotFiles.map((file) => [file.path, file.sha256]));
      const packages = [
        ...new Set(
          readJson<IndexedAsset[]>(path.join(source, "prepared/asset-index.json")).map(
            (asset) => asset.Source,
          ),
        ),
      ]
        .sort()
        .map((source) => {
          const sha256 = files.get(source.replace(/^resources\/game-client\//, ""));
          if (!sha256) throw new Error(`Missing frozen package ${source}`);
          return { source, sha256 };
        });
      writeJson(path.join(source, "packages.json"), packages);
      const clientReadRecords = readClientRecords(source, id);
      writeJson(path.join(staging, CLIENT_READ_RECORDS_FILE), clientReadRecords);
      const originals = await exportOriginals({
        objects: clientReadRecords.imageObjects,
        index: readJson<IndexedAsset[]>(path.join(source, "prepared/asset-index.json")),
        cache: path.join(cacheRoot(), "originals"),
        work: staging,
        clientSnapshotId,
        tool,
        implementation,
      });
      writeJson(path.join(staging, "originals.json"), originals);
      writeAssembly(staging, assemble(clientReadRecords, originals));
      await audit(
        { work: staging, environment: environmentDirectory },
        source,
        clientReadRecords.imageObjects,
      );
      await verifyCandidate(staging);
      await assertClientUnchanged(environment);
      if (
        (await ensureAnimeStudio()) !== tool ||
        (await implementationRevision()) !== implementation
      )
        throw new Error("Tool or implementation changed during extraction");
      const manifest: Manifest = {
        stageManifestVersion: STAGE_MANIFEST_VERSION,
        kind: "extraction",
        id,
        status: "verified",
        createdAt: new Date().toISOString(),
        inputs,
        implementation,
        profileHash,
        tools: environment.tools,
        outputs: await inventory(staging),
        result: { passed: true, validation: "passed", failures: [] },
      };
      await verifyStageInputs(
        manifest,
        environmentDirectory,
        await readVerifiedEnvironment(environmentDirectory),
      );
      return manifest;
    } catch (error) {
      const failures = path.join(cacheRoot(), "failures");
      fs.mkdirSync(failures, { recursive: true });
      fs.renameSync(staging, path.join(failures, path.basename(staging)));
      throw error;
    }
  });
  const { manifest } = await verifyExtraction(destination);
  await verifyStageInputs(manifest, environmentDirectory, environment);
  return id;
}
