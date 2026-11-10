import { useSyncExternalStore } from "react";

const TICK_MS = 1000;

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
}

// 取整到秒，使同一秒内快照保持稳定
function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

// 服务端与水合阶段没有可信的当前时间，返回 null 让调用方跳过渲染
function getServerSnapshot(): null {
  return null;
}

/** 每秒更新的当前时间戳；SSR 与水合阶段为 null。 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
