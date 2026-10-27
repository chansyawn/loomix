import { useSyncExternalStore } from "react";
import { createLayoutStore, layoutStorageKey, resolveLayout } from "./layout";
import type { CollectionLayout } from "./layout";

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

export function useCollectionLayout(explicit: CollectionLayout | undefined) {
  const preference = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot,
    () => undefined,
  );
  return resolveLayout(explicit, preference);
}

export const saveCollectionLayout = layoutStore.setLayout;
