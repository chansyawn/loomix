import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";

export type CollectionOrigin = { href: string; index: number };
declare module "@tanstack/react-router" {
  interface HistoryState {
    collectionOrigin?: CollectionOrigin;
  }
}
const lists = new Set([
  "all",
  "furniture",
  "clothing",
  "creatures",
  "plants",
  "dishes",
  "miscellany",
]);
export function collectionListPath(href: string) {
  const path = href.split(/[?#]/)[0];
  const segment = path.replace(/^\/collections\//, "");
  return lists.has(segment) && path === `/collections/${segment}` ? path : null;
}
export function collectionOrigin(location: ParsedLocation): CollectionOrigin | undefined {
  if (collectionListPath(location.pathname))
    return { href: location.href, index: location.state.__TSR_index };
  const origin = location.state.collectionOrigin;
  return origin &&
    collectionListPath(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
    ? origin
    : undefined;
}
export function useCollectionOrigin() {
  return useRouterState({ select: (state) => collectionOrigin(state.location) });
}
export function CollectionReturnLink({ children, ...props }: Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useCollectionOrigin();
  const href = origin?.href ?? "/collections/all";
  return (
    <Link
      {...props}
      to={collectionListPath(href) ?? "/collections/all"}
      search={defaultParseSearch(href.split("?")[1] ?? "")}
      onClick={(event) => {
        props.onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        )
          return;
        if (origin) {
          event.preventDefault();
          router.history.go(origin.index - router.state.location.state.__TSR_index);
        }
      }}
    >
      {children}
    </Link>
  );
}
