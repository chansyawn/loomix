import { Badge } from "@/ui/components/badge";
import type { DishItem } from "../collection-view";

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
    <section aria-labelledby="dish-effects" className="min-w-0 space-y-4">
      <h2 id="dish-effects" className="text-lg font-semibold">
        特殊效果
      </h2>
      <ul className="grid gap-3">
        {effects.map((effect, index) => {
          const metadata = effectMetadata(effect);
          return (
            <li key={`${effect.effectId}-${index}`} className="space-y-3">
              <div className="space-y-2">
                <h3 className="text-base font-medium wrap-anywhere">
                  {effect.name || "未命名效果"}
                </h3>
                {metadata.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.map((value) => (
                      <Badge key={value} variant="outline">
                        {value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm/6 whitespace-pre-line text-muted-foreground">
                {effect.description || "效果说明未提供"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
