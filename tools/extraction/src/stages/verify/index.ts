import fs from "node:fs";
import path from "node:path";
import { readManifest, verifyFiles } from "../../workflow/manifest.ts";
import { digest, inventory } from "../../workflow/hashing.ts";
import { identityDirectory } from "../../paths.ts";
import { verifyEnvironment } from "../../environment/verify.ts";
import { websiteDirectory } from "../postprocess/index.ts";
import { safeOutput } from "../../tasks/content/output.ts";
import { validate } from "../../tasks/content/validate.ts";

export async function verify(deliveryId: string): Promise<void> {
  const directory = identityDirectory("deliveries", deliveryId);
  const delivery = await readManifest(directory, "delivery");
  const bundle = identityDirectory("runs", delivery.inputs.id);
  await verifyFiles(bundle, delivery.inputs.files);
  const extraction = await readManifest(bundle, "extraction");
  const environmentDirectory = identityDirectory("environments", extraction.inputs.id);
  await verifyFiles(environmentDirectory, extraction.inputs.files);
  const environment = await verifyEnvironment(environmentDirectory);
  await validate({ work: bundle }, bundle, true, false);
  await validate({ work: directory }, bundle, false, false);
  safeOutput(websiteDirectory);
  const published = await inventory(
    websiteDirectory,
    fs
      .readdirSync(websiteDirectory)
      .flatMap((name) =>
        name === ".gitkeep"
          ? []
          : name === "assets"
            ? fs.readdirSync(path.join(websiteDirectory, name)).map((file) => `assets/${file}`)
            : [name],
      ),
  );
  const staged = delivery.outputs
    .filter((file) => file.path.startsWith("staging/"))
    .map((file) => ({ ...file, path: file.path.slice("staging/".length) }));
  if (
    digest(published) !==
    digest(staged.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)))
  )
    throw new Error("Published files do not match delivery manifest");
  console.log(
    `Verified environment ${environment.id}, extraction ${extraction.id}, delivery ${delivery.id}`,
  );
}
