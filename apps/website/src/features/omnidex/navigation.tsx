import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { omnidexOrigin, omnidexReturnLocation } from "./entry-location";
export function useOmnidexOrigin() {
  return useRouterState({ select: (state) => omnidexOrigin(state.location) });
}
export function OmnidexReturnLink({ children, ...props }: Omit<ComponentProps<"a">, "href">) {
  const router = useRouter();
  const origin = useOmnidexOrigin();
  return (
    <Link
      {...props}
      {...omnidexReturnLocation(origin)}
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
