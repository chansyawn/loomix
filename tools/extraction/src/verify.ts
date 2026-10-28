import { readManifest, verifyFiles } from "./workflow/manifest.ts";
import { digest, inventory, filesWithin } from "./workflow/hashing.ts";
import { identityDirectory, websiteDirectory } from "./paths.ts";
import { verifyEnvironment } from "./environment/verify.ts";
import { safeOutput } from "./delivery/output.ts";
import { verifyExtraction } from "./extraction/verify.ts";
import { verifyDelivery } from "./delivery/verify.ts";

export async function verify(deliveryId: string): Promise<void> {
  const directory = identityDirectory("deliveries", deliveryId);
  const delivery = await readManifest(directory, "delivery");
  const bundle = identityDirectory("extractions", delivery.inputs.id);
  await verifyFiles(bundle, delivery.inputs.files);
  const extraction = await readManifest(bundle, "extraction");
  const environmentDirectory = identityDirectory("environments", extraction.inputs.id);
  await verifyFiles(environmentDirectory, extraction.inputs.files);
  const environment = await verifyEnvironment(environmentDirectory);
  await verifyExtraction(bundle, false);
  await verifyDelivery(directory, bundle, false);
  if (delivery.deliveryMode === "artifact-only") {
    console.log(
      `Verified artifact-only environment ${environment.id}, extraction ${extraction.id}, delivery ${delivery.id}`,
    );
    return;
  }
  safeOutput(websiteDirectory);
  const published = await inventory(
    websiteDirectory,
    filesWithin(websiteDirectory).filter((file) => file !== ".gitkeep"),
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
