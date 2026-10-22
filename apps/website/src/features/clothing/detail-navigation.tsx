import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { clothingSearchSchema } from "./search";
import type { View } from "./search";

type ClothingOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    clothingOrigin?: ClothingOrigin;
  }
}

export function clothingOrigin(location: ParsedLocation): ClothingOrigin | undefined {
  if (location.pathname === "/collection/clothing") {
    return {
      href: location.href,
      index: location.state.__TSR_index,
    };
  }
  const origin = location.state.clothingOrigin;
  if (
    origin &&
    /^\/collection\/clothing(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useClothingOrigin() {
  return useRouterState({ select: (state) => clothingOrigin(state.location) });
}

export function ClothingReturnLink({
  view,
  children,
  ...props
}: { view: View } & Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useClothingOrigin();
  const search = clothingSearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : { view },
  );
  return (
    <Link
      {...props}
      to="/collection/clothing"
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
