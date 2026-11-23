import path from "node:path";
import { websiteDirectory } from "../paths.ts";
import { withLock } from "../workflow/lock.ts";
import { resolveStage, type StageLocation } from "../workflow/manifest.ts";
import { verifyResourcePackage } from "../verify.ts";
import { WEBSITE_RESOURCE_DIRECTORY } from "./files.ts";
import { replaceLocalResources } from "./replace.ts";

export async function installLocalResources(
  resourcePackageReference: string,
): Promise<StageLocation> {
  const resourcePackage = resolveStage("resource-package", resourcePackageReference);
  const { directory } = resourcePackage;
  await withLock(`${directory}.lock`, async () => {
    await withLock(`${websiteDirectory}.lock`, async () => {
      const manifest = await verifyResourcePackage(resourcePackage);
      const prefix = `${WEBSITE_RESOURCE_DIRECTORY}/`;
      await replaceLocalResources(
        path.join(directory, WEBSITE_RESOURCE_DIRECTORY),
        websiteDirectory,
        manifest.outputs
          .filter((file) => file.path.startsWith(prefix))
          .map((file) => ({ ...file, path: file.path.slice(prefix.length) }))
          .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
      );
    });
  });
  return resourcePackage;
}
