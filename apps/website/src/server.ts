import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { withPreviewHeaders } from "./infrastructure/preview-response";

export default createServerEntry({
  async fetch(request, options) {
    return withPreviewHeaders(request, await handler.fetch(request, options));
  },
});
