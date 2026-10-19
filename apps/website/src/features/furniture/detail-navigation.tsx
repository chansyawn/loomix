import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { furnitureSearchSchema } from "./search";
import type { View } from "./search";

type FurnitureOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    furnitureOrigin?: FurnitureOrigin;
  }
}

export function furnitureOrigin(location: ParsedLocation): FurnitureOrigin | undefined {
  if (location.pathname === "/collection/furniture") {
    return {
      href: location.href,
      index: location.state.__TSR_index,
    };
  }
  const origin = location.state.furnitureOrigin;
  if (
    origin &&
    /^\/collection\/furniture(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useFurnitureOrigin() {
  return useRouterState({ select: (state) => furnitureOrigin(state.location) });
}

export function FurnitureReturnLink({
  view,
  children,
  ...props
}: { view: View } & Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useFurnitureOrigin();
  const search = furnitureSearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : { view },
  );
  return (
    <Link
      {...props}
      to="/collection/furniture"
      search={search}
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
