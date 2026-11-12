import { expect, test } from "vite-plus/test";
import { withPreviewHeaders } from "./preview-response";

test.each(["pr-42", "deployment-pr-42"])("marks %s responses as noindex", async (name) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("preview"));
      controller.close();
    },
  });
  const headers = new Headers({ "content-type": "text/html", "x-request-id": "request-id" });
  headers.append("set-cookie", "first=one; Path=/; HttpOnly");
  headers.append("set-cookie", "second=two; Path=/; Secure");
  const response = new Response(stream, { status: 404, statusText: "Missing", headers });
  const result = withPreviewHeaders(new Request(`https://${name}.preview.loomix.fun/`), response);
  expect(result.headers.get("x-robots-tag")).toBe("noindex");
  expect(result.headers.get("x-request-id")).toBe("request-id");
  expect(result.headers.getSetCookie()).toEqual(headers.getSetCookie());
  expect(result.status).toBe(404);
  expect(result.statusText).toBe("Missing");
  expect(await result.text()).toBe("preview");
});

test("preserves redirects", () => {
  const response = new Response(null, { status: 302, headers: { location: "/destination" } });
  const result = withPreviewHeaders(new Request("https://pr-42.preview.loomix.fun/"), response);
  expect(result.status).toBe(302);
  expect(result.headers.get("location")).toBe("/destination");
  expect(result.headers.get("x-robots-tag")).toBe("noindex");
});

test.each(["loomix.fun", "assets.loomix.fun", "preview.loomix.fun"])(
  "passes through responses for %s",
  (hostname) => {
    const response = new Response("production");
    expect(withPreviewHeaders(new Request(`https://${hostname}/`), response)).toBe(response);
    expect(response.headers.has("x-robots-tag")).toBe(false);
  },
);
