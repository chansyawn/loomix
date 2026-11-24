import { useSyncExternalStore } from "react";
import { createLayoutStore, layoutStorageKey, resolveLayout } from "./layout";
import type { ListLayout } from "./layout";

const layoutStore = createLayoutStore({
  read: () => window.localStorage.getItem(layoutStorageKey),
  write: (value) => window.localStorage.setItem(layoutStorageKey, value),
  subscribe: (listener) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === layoutStorageKey || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
});

export function useListLayout(
  explicit: ListLayout | undefined,
  writeLayout?: (layout: ListLayout) => void,
) {
  const preference = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot,
    () => undefined,
  );
  return {
    layout: resolveLayout(explicit, preference),
    onLayoutChange: writeLayout
      ? (layout: ListLayout) => {
          layoutStore.setLayout(layout);
          writeLayout(layout);
        }
      : undefined,
  };
}
