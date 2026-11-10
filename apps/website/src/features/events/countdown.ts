export interface CountdownEvent {
  id: string;
  title: string;
  description?: string;
  /** 带时区的 ISO 8601 字符串，例如 2026-12-04T10:00:00+08:00 */
  startsAt: string;
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function getStartTimestamp(event: CountdownEvent): number {
  return Date.parse(event.startsAt);
}

/** 当前时间由调用方传入，保证函数纯净且可测试。 */
export function getCountdownParts(targetMs: number, nowMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - nowMs);
  return {
    days: Math.floor(totalMs / DAY_MS),
    hours: Math.floor((totalMs % DAY_MS) / HOUR_MS),
    minutes: Math.floor((totalMs % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((totalMs % MINUTE_MS) / SECOND_MS),
    totalMs,
  };
}

export function isCountdownActive(event: CountdownEvent, nowMs: number): boolean {
  return nowMs < getStartTimestamp(event);
}

/** 过滤已到期活动，其余按开始时间升序排列；无效日期的活动会被丢弃。 */
export function selectActiveEvents(
  events: readonly CountdownEvent[],
  nowMs: number,
): CountdownEvent[] {
  return events
    .filter((event) => isCountdownActive(event, nowMs))
    .sort((a, b) => getStartTimestamp(a) - getStartTimestamp(b));
}
