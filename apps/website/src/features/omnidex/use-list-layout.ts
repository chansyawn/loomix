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

export function useListLayout(explicit: ListLayout | undefined) {
  const preference = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot,
    () => undefined,
  );
  return resolveLayout(explicit, preference);
}

export const saveListLayout = layoutStore.setLayout;
