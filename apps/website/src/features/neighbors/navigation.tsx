import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { neighborsSearchSchema } from "./search";

type NeighborsOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    neighborsOrigin?: NeighborsOrigin;
  }
}

export function neighborsOrigin(location: ParsedLocation): NeighborsOrigin | undefined {
  if (location.pathname === "/neighbors") {
    return {
      href: location.href,
      index: location.state.__TSR_index,
    };
  }
  const origin = location.state.neighborsOrigin;
  if (
    origin &&
    /^\/neighbors(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useNeighborsOrigin() {
  return useRouterState({ select: (state) => neighborsOrigin(state.location) });
}

export function NeighborsReturnLink({ children, ...props }: Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useNeighborsOrigin();
  const search = neighborsSearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : {},
  );
  return (
    <Link
      {...props}
      to="/neighbors"
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
