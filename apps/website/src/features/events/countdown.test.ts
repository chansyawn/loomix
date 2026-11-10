import { describe, expect, it } from "vite-plus/test";

import {
  getCountdownParts,
  getStartTimestamp,
  isCountdownActive,
  selectActiveEvents,
  type CountdownEvent,
} from "./countdown";

const event = (id: string, startsAt: string): CountdownEvent => ({ id, title: id, startsAt });

describe("getCountdownParts", () => {
  it("拆分天、时、分、秒", () => {
    const now = Date.parse("2026-12-01T00:00:00+08:00");
    const target = now + ((3 * 24 + 4) * 60 * 60 + 5 * 60 + 6) * 1000;
    expect(getCountdownParts(target, now)).toEqual({
      days: 3,
      hours: 4,
      minutes: 5,
      seconds: 6,
      totalMs: target - now,
    });
  });

  it("恰好整分整秒时各字段为 0", () => {
    const now = 0;
    expect(getCountdownParts(60_000, now)).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: 0,
    });
  });

  it("目标已过或恰好等于当前时全部为 0", () => {
    expect(getCountdownParts(1000, 5000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
    expect(getCountdownParts(5000, 5000).totalMs).toBe(0);
  });
});

describe("时间解析", () => {
  it("带 +08:00 的 ISO 字符串解析为对应的 UTC 时间戳", () => {
    expect(getStartTimestamp(event("a", "2026-12-04T10:00:00+08:00"))).toBe(
      Date.UTC(2026, 11, 4, 2, 0, 0),
    );
  });
});

describe("isCountdownActive", () => {
  const beta = event("beta", "2026-12-04T10:00:00+08:00");
  const startMs = getStartTimestamp(beta);

  it("开始前为活跃", () => {
    expect(isCountdownActive(beta, startMs - 1)).toBe(true);
  });

  it("恰好开始及之后为非活跃", () => {
    expect(isCountdownActive(beta, startMs)).toBe(false);
    expect(isCountdownActive(beta, startMs + 1)).toBe(false);
  });

  it("日期无效时视为非活跃", () => {
    expect(isCountdownActive(event("bad", "not-a-date"), 0)).toBe(false);
  });
});

describe("selectActiveEvents", () => {
  it("过滤已到期活动并按开始时间升序排列", () => {
    const now = Date.parse("2026-12-01T00:00:00+08:00");
    const events = [
      event("late", "2026-12-20T00:00:00+08:00"),
      event("expired", "2026-11-01T00:00:00+08:00"),
      event("soon", "2026-12-04T10:00:00+08:00"),
    ];
    expect(selectActiveEvents(events, now).map((e) => e.id)).toEqual(["soon", "late"]);
  });

  it("全部到期时返回空数组", () => {
    const events = [event("expired", "2026-11-01T00:00:00+08:00")];
    expect(selectActiveEvents(events, Date.parse("2026-12-01T00:00:00+08:00"))).toEqual([]);
  });
});
