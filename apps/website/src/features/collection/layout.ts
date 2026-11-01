import { z } from "zod";

export const collectionLayoutSchema = z.enum(["grid", "table"]).optional().catch(undefined);
export type CollectionLayout = "grid" | "table";
export const layoutStorageKey = "loomix:collection-layout:v1";

export function resolveLayout(explicit: unknown, preference: unknown): CollectionLayout {
  return (
    collectionLayoutSchema.parse(explicit) ?? collectionLayoutSchema.parse(preference) ?? "grid"
  );
}

export interface LayoutStorage {
  read: () => string | null;
  write: (value: CollectionLayout) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createLayoutStore(storage: LayoutStorage) {
  let snapshot: CollectionLayout | undefined;
  let initialized = false;
  let inMemoryOnly = false;
  let unsubscribe: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const read = () => {
    if (inMemoryOnly) return;
    try {
      snapshot = collectionLayoutSchema.parse(storage.read());
    } catch {
      // 存储区域不可访问时，不得丢弃内存中的偏好设置。
    }
    initialized = true;
  };
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => {
      if (!initialized) read();
      return snapshot;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (!unsubscribe) {
        unsubscribe = storage.subscribe(() => {
          inMemoryOnly = false;
          read();
          notify();
        });
        read();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribe?.();
          unsubscribe = undefined;
        }
      };
    },
    setLayout: (layout: CollectionLayout) => {
      snapshot = layout;
      initialized = true;
      try {
        storage.write(layout);
        inMemoryOnly = false;
      } catch {
        inMemoryOnly = true;
        // 持久化失败时，仍在当前会话中共享偏好设置。
      }
      notify();
    },
  };
}
