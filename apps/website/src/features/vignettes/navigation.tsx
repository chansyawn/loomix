import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { vignetteSearchDefaults, type VignetteSearch } from "./search";

export type VignetteOrigin = { search: VignetteSearch; index: number };

declare module "@tanstack/react-router" {
  interface HistoryState {
    vignetteOrigin?: VignetteOrigin;
  }
}

export function VignetteReturnLink({ children, ...props }: Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const index = useRouterState({ select: (state) => state.location.state.__TSR_index });
  const source = useRouterState({ select: (state) => state.location.state.vignetteOrigin });
  const origin =
    source && Number.isInteger(source.index) && source.index >= 0 && source.index < index
      ? source
      : undefined;

  return (
    <Link
      {...props}
      to="/vignettes"
      search={origin?.search ?? vignetteSearchDefaults}
      onClick={(event) => {
        props.onClick?.(event);
        if (
          !origin ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        )
          return;
        event.preventDefault();
        router.history.go(origin.index - index);
      }}
    >
      {children}
    </Link>
  );
}
