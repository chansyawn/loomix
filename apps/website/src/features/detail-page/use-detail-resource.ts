import { useEffect, useState } from "react";
type Result<Value> = { status: "error" } | { status: "ready"; value: Value };

export type DetailResourceState<Value> =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; value: Value };

export function useDetailResource<Value>(
  read: (() => Promise<Value>) | undefined,
): DetailResourceState<Value> | undefined {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    read: () => Promise<Value>;
    attempt: number;
    result: Result<Value>;
  }>();

  useEffect(() => {
    if (!read) return;
    let active = true;
    const publish = (result: Result<Value>) => {
      if (active) setSettled({ read, attempt, result });
    };
    void read().then(
      (value) => publish({ status: "ready", value }),
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
