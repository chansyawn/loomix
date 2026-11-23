import { describe, expect, it } from "vite-plus/test";
import { createLayoutStore, layoutStorageKey, resolveLayout } from "./layout";
import type { LayoutStorage } from "./layout";

function storage(initial: string | null = null) {
  let value = initial;
  let listener: (() => void) | undefined;
  const adapter: LayoutStorage = {
    read: () => value,
    write: (next) => {
      value = next;
    },
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    },
  };
  return {
    adapter,
    read: () => value,
    externalChange: (next: string | null) => {
      value = next;
      listener?.();
    },
  };
}

describe("collection layout preference", () => {
  it("prefers explicit URLs over saved preferences and defaults to cards", () => {
    expect(resolveLayout("grid", "table")).toBe("grid");
    expect(resolveLayout("table", "grid")).toBe("table");
    for (const invalid of [undefined, null, "invalid", 42, [], {}]) {
      expect(resolveLayout(invalid, "table")).toBe("table");
      expect(resolveLayout(undefined, invalid)).toBe("grid");
    }
    expect(layoutStorageKey).toBe("loomix:collection-layout:v1");
  });

  it("does not overwrite the preference when a shared URL overrides it", () => {
    const saved = storage("table");
    const store = createLayoutStore(saved.adapter);
    expect(resolveLayout("grid", store.getSnapshot())).toBe("grid");
    expect(saved.read()).toBe("table");
    expect(resolveLayout(undefined, store.getSnapshot())).toBe("table");
  });

  it("persists active choices and publishes them to all subscribers", () => {
    const saved = storage();
    const store = createLayoutStore(saved.adapter);
    const first: unknown[] = [];
    const second: unknown[] = [];
    const unsubscribe = store.subscribe(() => first.push(store.getSnapshot()));
    const stop = store.subscribe(() => second.push(store.getSnapshot()));
    store.setLayout("table");
    expect(saved.read()).toBe("table");
    expect(first).toEqual(["table"]);
    expect(second).toEqual(["table"]);
    unsubscribe();
    store.setLayout("grid");
    expect(first).toEqual(["table"]);
    expect(second).toEqual(["table", "grid"]);
    stop();
  });

  it("restores preferences on a new session and handles external changes and deletion", () => {
    const saved = storage("grid");
    const store = createLayoutStore(saved.adapter);
    const received: unknown[] = [];
    const stop = store.subscribe(() =>
      received.push(resolveLayout(undefined, store.getSnapshot())),
    );
    saved.externalChange("table");
    expect(received).toEqual(["table"]);
    saved.externalChange(null);
    expect(received).toEqual(["table", "grid"]);
    saved.externalChange("broken");
    expect(store.getSnapshot()).toBeUndefined();
    stop();
    store.setLayout("table");
    expect(createLayoutStore(saved.adapter).getSnapshot()).toBe("table");
  });

  it("keeps a usable session preference when storage reads or writes fail", () => {
    const saved = storage();
    const adapter = {
      ...saved.adapter,
      read: () => {
        throw new Error("blocked");
      },
      write: () => {
        throw new Error("quota");
      },
    };
    const store = createLayoutStore(adapter);
    expect(resolveLayout(undefined, store.getSnapshot())).toBe("grid");
    const stop = store.subscribe(() => {});
    store.setLayout("table");
    expect(store.getSnapshot()).toBe("table");
    stop();
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot()).toBe("table");
    unsubscribe();
  });

  it("does not lose a failed write when another category subscribes", () => {
    const saved = storage("grid");
    const store = createLayoutStore({
      ...saved.adapter,
      write: () => {
        throw new Error("quota");
      },
    });
    const stop = store.subscribe(() => {});
    store.setLayout("table");
    stop();
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot()).toBe("table");
    expect(saved.read()).toBe("grid");
    unsubscribe();
  });
});
