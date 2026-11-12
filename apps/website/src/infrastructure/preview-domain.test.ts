import { expect, test } from "vite-plus/test";
import { isPreviewHostname, previewOrigin, selectPreviewUrl } from "./preview-domain";

test("selects the stable URL for the requested PR", () => {
  const origin = previewOrigin(42);
  expect(origin).toBe("https://pr-42.preview.loomix.fun");
  expect(selectPreviewUrl(42, ["https://deployment-pr-42.preview.loomix.fun", origin])).toBe(
    origin,
  );
  expect(selectPreviewUrl(42, [`${origin}/`])).toBe(`${origin}/`);
});

test.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid PR number %s",
  (number) => expect(() => previewOrigin(number)).toThrow("positive PR number"),
);

test.each([
  "https://pr-41.preview.loomix.fun",
  "https://pr-42-loomix-website.chansyawn.workers.dev",
  "https://pr-42.loomix.fun",
  "http://pr-42.preview.loomix.fun",
  "https://pr-42.preview.loomix.fun:8080",
  "https://pr-42.preview.loomix.fun/path",
  "https://pr-42.preview.loomix.fun.evil.example",
])("rejects an unrelated deployment URL %s", (url) => {
  expect(() => selectPreviewUrl(42, [url])).toThrow("expected Preview URL");
});

test.each(["pr-42.preview.loomix.fun", "deployment-pr-42.preview.loomix.fun"])(
  "recognizes Preview hostname %s",
  (hostname) => expect(isPreviewHostname(hostname)).toBe(true),
);

test.each([
  "loomix.fun",
  "assets.loomix.fun",
  "preview.loomix.fun",
  "pr-42.preview.loomix.fun.evil.example",
  "pr-42.evilpreview.loomix.fun",
  "nested.pr-42.preview.loomix.fun",
])("excludes unrelated hostname %s", (hostname) => {
  expect(isPreviewHostname(hostname)).toBe(false);
});
