import type { CountdownEvent } from "./countdown";

/** 首页展示的倒计时活动；新增活动只需在此追加一项，到期后自动隐藏。 */
export const countdownEvents: readonly CountdownEvent[] = [
  {
    id: "open-beta",
    title: "公测倒计时",
    startsAt: "2026-12-04T10:00:00+08:00",
  },
];
