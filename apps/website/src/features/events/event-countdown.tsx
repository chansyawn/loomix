import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/components/card";

import {
  getCountdownParts,
  getStartTimestamp,
  type CountdownEvent,
  type CountdownParts,
} from "./countdown";
import { FlipDigit } from "./flip-digit";

const startTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  dateStyle: "long",
  timeStyle: "short",
});

const segments = [
  { key: "days", label: "天" },
  { key: "hours", label: "时" },
  { key: "minutes", label: "分" },
  { key: "seconds", label: "秒" },
] as const satisfies readonly { key: keyof CountdownParts; label: string }[];

function formatRemaining(parts: CountdownParts): string {
  return `剩余 ${parts.days} 天 ${parts.hours} 小时 ${parts.minutes} 分钟`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

interface EventCountdownProps {
  event: CountdownEvent;
  nowMs: number;
}

export function EventCountdown({ event, nowMs }: EventCountdownProps) {
  const targetMs = getStartTimestamp(event);
  const parts = getCountdownParts(targetMs, nowMs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>
          {event.description ?? `${startTimeFormatter.format(targetMs)}（北京时间）`}
        </CardDescription>
      </CardHeader>
      {/* aria-label 只精确到分钟，避免读屏每秒播报 */}
      <div
        role="timer"
        aria-label={formatRemaining(parts)}
        className="grid grid-cols-4 gap-2 px-(--card-spacing) sm:gap-3"
      >
        {segments.map(({ key, label }) => (
          <div
            key={key}
            aria-hidden="true"
            className="flex flex-col items-center gap-1 rounded-lg bg-muted py-3"
          >
            <span className="flex gap-0.5 font-heading text-2xl font-semibold text-foreground tabular-nums sm:text-4xl">
              {pad(parts[key])
                .split("")
                .map((digit, index) => (
                  <FlipDigit key={index} digit={digit} />
                ))}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
