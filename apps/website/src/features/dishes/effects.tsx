import { Badge } from "@/ui/components/badge";
import type { DishItem } from "../omnidex-view";

function effectMetadata(effect: NonNullable<DishItem["effects"]>[number]): string[] {
  return [
    effect.level === null ? null : `阶数 ${effect.level}`,
    effect.uses === null ? null : `可用 ${effect.uses} 次`,
    effect.durationSeconds === null ? null : `持续 ${effect.durationSeconds} 秒`,
  ].filter((value): value is string => value !== null);
}

export function DishEffects({ effects }: { effects: DishItem["effects"] }) {
  if (!effects?.length) return null;
  return (
    <ul className="grid gap-3">
      {effects.map((effect, index) => {
        const metadata = effectMetadata(effect);
        return (
          <li key={`${effect.effectId}-${index}`} className="grid">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 py-1 tabular-nums">
              <span className="font-medium">{effect.name || "未命名效果"}</span>
              {metadata.map((value) => (
                <Badge key={value} variant="outline" className="h-6">
                  {value}
                </Badge>
              ))}
            </div>
            <p className="text-sm/6 whitespace-pre-line text-muted-foreground">
              {effect.description || "效果说明未提供"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
