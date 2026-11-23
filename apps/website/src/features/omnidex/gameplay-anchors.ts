import { useRouterState } from "@tanstack/react-router";
import { useLayoutEffect, useState } from "react";

export type GameplayAnchorKind = "recipe" | "slot" | "requirement";

export function gameplayAnchor(kind: GameplayAnchorKind, id: number) {
  return `${kind}-${id}`;
}

export function useGameplayAccordion(kind: GameplayAnchorKind, ids: readonly number[]) {
  const hash = useRouterState({ select: (state) => state.location.hash });
  const target = ids.map((id) => gameplayAnchor(kind, id)).find((anchor) => anchor === hash);
  const invalidAnchor = hash.startsWith(`${kind}-`) && !target;
  const [expansion, setExpansion] = useState({ hash, value: target ? [target] : [] });
  if (hash !== expansion.hash) {
    let value = expansion.value;
    if (invalidAnchor) value = [];
    else if (target && !value.includes(target)) value = [...value, target];
    setExpansion({ hash, value });
  }
  useLayoutEffect(() => {
    if (invalidAnchor)
      document.querySelector('[data-scroll-restoration-id="wiki-content"]')?.scrollTo(0, 0);
  }, [hash, invalidAnchor]);
  return {
    value: expansion.value,
    onValueChange: (value: string[]) => setExpansion({ hash, value }),
  };
}
