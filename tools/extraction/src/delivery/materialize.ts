import { identityDirectory, websiteDirectory } from "../paths.ts";
import { withLock } from "../workflow/lock.ts";
import { readManifest, verifyFiles } from "../workflow/manifest.ts";
import { publish, safeOutput } from "./publish.ts";
import { verifyDelivery } from "./verify.ts";

export async function materialize(deliveryId: string): Promise<void> {
  const directory = identityDirectory("deliveries", deliveryId);
  await withLock(`${directory}.lock`, async () => {
    const delivery = await readManifest(directory, "delivery");
    if (delivery.deliveryMode !== "artifact-only")
      throw new Error("Materialize requires an artifact-only delivery");
    const extraction = identityDirectory("extractions", delivery.inputs.id);
    await readManifest(extraction, "extraction");
    await verifyFiles(extraction, delivery.inputs.files);
    safeOutput(websiteDirectory);
    await withLock(`${websiteDirectory}.lock`, async () => {
      await publish({ work: directory, output: websiteDirectory }, async () => {
        const latest = await readManifest(directory, "delivery");
        if (latest.id !== deliveryId || latest.deliveryMode !== "artifact-only")
          throw new Error("Delivery identity changed during materialization");
        await verifyDelivery(directory, extraction, false);
      });
    });
  });
}
