import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import type { ParsedLocation } from "@tanstack/react-router";
import { dishesSearchSchema } from "./search";
import type { View } from "./search";

type DishesOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    dishesOrigin?: DishesOrigin;
  }
}

export function dishesOrigin(location: ParsedLocation): DishesOrigin | undefined {
  if (location.pathname === "/collection/dishes") {
    return { href: location.href, index: location.state.__TSR_index };
  }
  const origin = location.state.dishesOrigin;
  if (
    origin &&
    /^\/collection\/dishes(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useDishesOrigin() {
  return useRouterState({ select: (state) => dishesOrigin(state.location) });
}

export function DishesReturnLink({
  view,
  children,
  ...props
}: { view: View } & Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useDishesOrigin();
  const search = dishesSearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : { view },
  );
  return (
    <Link
      {...props}
      to="/collection/dishes"
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
