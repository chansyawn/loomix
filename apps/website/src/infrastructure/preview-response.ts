import { isPreviewHostname } from "./preview-domain";

export function withPreviewHeaders(request: Request, response: Response): Response {
  if (!isPreviewHostname(new URL(request.url).hostname)) return response;
  const preview = new Response(response.body, response);
  preview.headers.set("X-Robots-Tag", "noindex");
  return preview;
}
