import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { miscellanySearchSchema } from "./search";

type MiscellanyOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    miscellanyOrigin?: MiscellanyOrigin;
  }
}

export function miscellanyOrigin(location: ParsedLocation): MiscellanyOrigin | undefined {
  if (location.pathname === "/collection/miscellany") {
    return { href: location.href, index: location.state.__TSR_index };
  }
  const origin = location.state.miscellanyOrigin;
  if (
    origin &&
    /^\/collection\/miscellany(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useMiscellanyOrigin() {
  return useRouterState({ select: (state) => miscellanyOrigin(state.location) });
}

export function MiscellanyReturnLink({ children, ...props }: ComponentProps<"a">) {
  const router = useRouter();
  const origin = useMiscellanyOrigin();
  const search = miscellanySearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : {},
  );

  return (
    <Link
      {...props}
      to="/collection/miscellany"
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
