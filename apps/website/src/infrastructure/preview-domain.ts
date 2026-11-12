const previewDomain = "preview.loomix.fun";

export function previewOrigin(number: number): string {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error("Preview requires a positive PR number");
  }
  return `https://pr-${number}.${previewDomain}`;
}

export function isPreviewHostname(hostname: string): boolean {
  const suffix = `.${previewDomain}`;
  if (!hostname.endsWith(suffix)) return false;
  const prefix = hostname.slice(0, -suffix.length);
  return prefix.length > 0 && !prefix.includes(".");
}

export function selectPreviewUrl(number: number, urls: readonly string[]): string {
  const origin = previewOrigin(number);
  const url = urls.find((value) => value === origin || value === `${origin}/`);
  if (!url) throw new Error(`Cloudflare did not return the expected Preview URL: ${origin}`);
  return url;
}
