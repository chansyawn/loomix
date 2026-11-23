import { defaultParseSearch, type ParsedLocation } from "@tanstack/react-router";
import { catalogItem, omnidexNavigation } from "../layout/navigation";

export const catalogEntryPath = "/catalog/$id";
export const catalogEntryRouteId = "/catalog_/$id";

export type OmnidexOrigin = { href: string; index: number };
declare module "@tanstack/react-router" {
  interface HistoryState {
    omnidexOrigin?: OmnidexOrigin;
  }
}

export function omnidexListPath(href: string) {
  const pathname = href.split(/[?#]/)[0];
  return omnidexNavigation.items.find((item) => item.to === pathname)?.to;
}

export function omnidexOrigin(location: ParsedLocation): OmnidexOrigin | undefined {
  if (omnidexListPath(location.pathname))
    return { href: location.href, index: location.state.__TSR_index };
  const origin = location.state.omnidexOrigin;
  if (
    origin &&
    omnidexListPath(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
}

export function omnidexReturnLocation(origin: OmnidexOrigin | undefined) {
  if (origin) {
    const to = omnidexListPath(origin.href);
    if (to) {
      const url = new URL(origin.href, "https://loomix.invalid");
      return { to, search: defaultParseSearch(url.search), hash: url.hash.slice(1) };
    }
  }
  return { to: catalogItem.to, search: {}, hash: "" };
}

export function catalogEntryLocation(entry: { id: number }) {
  return {
    to: catalogEntryPath as typeof catalogEntryPath,
    params: { id: String(entry.id) },
    search: {},
  };
}
