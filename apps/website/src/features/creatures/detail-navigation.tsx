import { Link, defaultParseSearch, useRouter, useRouterState } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { creaturesSearchSchema } from "./search";
import type { View } from "./search";

type CreaturesOrigin = { href: string; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    creaturesOrigin?: CreaturesOrigin;
  }
}

export function creaturesOrigin(location: ParsedLocation): CreaturesOrigin | undefined {
  if (location.pathname === "/collection/creatures") {
    return {
      href: location.href,
      index: location.state.__TSR_index,
    };
  }
  const origin = location.state.creaturesOrigin;
  if (
    origin &&
    /^\/collection\/creatures(?:\?|$)/.test(origin.href) &&
    Number.isInteger(origin.index) &&
    origin.index >= 0 &&
    origin.index < location.state.__TSR_index
  )
    return origin;
  return undefined;
}

export function useCreaturesOrigin() {
  return useRouterState({ select: (state) => creaturesOrigin(state.location) });
}

export function CreaturesReturnLink({
  view,
  children,
  ...props
}: { view: View } & Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useCreaturesOrigin();
  const search = creaturesSearchSchema.parse(
    origin ? defaultParseSearch(origin.href.split("?")[1] ?? "") : { view },
  );
  return (
    <Link
      {...props}
      to="/collection/creatures"
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
