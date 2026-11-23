import { ReleaseIdSchema } from "@loomix/schema/release";
import type { WebsiteResourceManifest } from "@loomix/schema/website-resources";

export function createReleaseId(
  manifest: Pick<WebsiteResourceManifest, "source" | "formatVersion">,
  sequence = 1,
  date = new Date(),
): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999)
    throw new Error("发布序号必须在 1～999 之间");
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  const release = `${day}-g${manifest.source.gameVersion}-f${manifest.formatVersion}-r${String(sequence).padStart(3, "0")}`;
  return ReleaseIdSchema.parse(release);
}
