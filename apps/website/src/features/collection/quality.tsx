import { Badge } from "@/ui/components/badge";
export const qualityNames = ["普通", "优质", "珍稀", "特等", "奇迹"];
const qualityBackgrounds = [
  "var(--quality-common)",
  "var(--quality-fine)",
  "var(--quality-rare)",
  "var(--quality-excellent)",
  "var(--quality-miracle)",
];

export function QualityBadge({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  return (
    <Badge variant="outline">
      <span className="size-1.5 rounded-full" style={{ background: qualityBackgrounds[quality] }} />
      {qualityNames[quality]}
    </Badge>
  );
}

export function QualityBar({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  return (
    <span
      role="img"
      aria-label={`品阶：${qualityNames[quality]}`}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1"
      style={{ background: qualityBackgrounds[quality] }}
    />
  );
}
