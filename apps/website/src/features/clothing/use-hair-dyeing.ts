import { useEffect, useState } from "react";
import type { HairDyeingRegion, ReadHairDyeing } from "./hair-dyeing";

export type HairDyeingState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; regions: HairDyeingRegion[] };

type Result = { status: "error" } | { status: "ready"; regions: HairDyeingRegion[] };

export function useHairDyeing(read: ReadHairDyeing | undefined): HairDyeingState | undefined {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    read: ReadHairDyeing;
    attempt: number;
    result: Result;
  }>();

  useEffect(() => {
    if (!read) return;
    let active = true;
    const publish = (result: Result) => {
      if (active) setSettled({ read, attempt, result });
    };
    void read().then(
      (regions) => publish({ status: "ready", regions }),
      () => publish({ status: "error" }),
    );
    return () => {
      active = false;
    };
  }, [read, attempt]);

  if (!read) return undefined;
  if (settled?.read !== read || settled.attempt !== attempt) return { status: "loading" };
  return settled.result.status === "error"
    ? { status: "error", retry: () => setAttempt((previous) => previous + 1) }
    : settled.result;
}
