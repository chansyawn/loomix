import { Badge } from "@/ui/components/badge";
import CommonMarker from "@/assets/quality-markers/common.svg?react";
import FineMarker from "@/assets/quality-markers/fine.svg?react";
import RareMarker from "@/assets/quality-markers/rare.svg?react";
import ExcellentMarker from "@/assets/quality-markers/excellent.svg?react";
import MiracleMarker from "@/assets/quality-markers/miracle.svg?react";

export const qualityNames = ["普通", "优质", "珍稀", "特等", "奇迹"];
const qualityBackgrounds = [
  "var(--quality-common)",
  "var(--quality-fine)",
  "var(--quality-rare)",
  "var(--quality-excellent)",
  "var(--quality-miracle)",
];
const qualityMarkers = [CommonMarker, FineMarker, RareMarker, ExcellentMarker, MiracleMarker];

export function QualityMarker({ quality }: { quality: number }) {
  const Marker = qualityMarkers[quality];
  if (!Marker) return null;

  return (
    <Marker
      role="img"
      aria-label={`品阶：${qualityNames[quality]}`}
      width={32}
      height={48}
      className="h-9 w-auto shrink-0"
    />
  );
}

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
