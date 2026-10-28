import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import type { DishItem } from "../collection-view";

function effectMetadata(effect: NonNullable<DishItem["effects"]>[number]): string[] {
  return [
    effect.level === null ? null : `阶数 ${effect.level}`,
    effect.uses === null ? null : `可用 ${effect.uses} 次`,
    effect.durationSeconds === null ? null : `持续 ${effect.durationSeconds} 秒`,
  ].filter((value): value is string => value !== null);
}

export function DishEffects({ effects }: { effects: DishItem["effects"] }) {
  return (
    <section aria-labelledby="dish-effects" className="min-w-0 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <SparklesIcon aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 id="dish-effects" className="text-lg font-semibold">
            特殊效果
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            结构化效果信息来自菜肴配置，可能与基础效果同时存在。
          </p>
        </div>
      </div>
      {effects?.length ? (
        <ul className="grid gap-3">
          {effects.map((effect, index) => {
            const metadata = effectMetadata(effect);
            return (
              <li key={`${effect.effectId}-${index}`} className="space-y-3 rounded-2xl border p-5">
                <div className="space-y-2">
                  <h3 className="font-medium wrap-anywhere">{effect.name || "未命名效果"}</h3>
                  {metadata.length > 0 && (
                    <p className="text-xs text-muted-foreground">{metadata.join(" · ")}</p>
                  )}
                </div>
                <p className="text-sm leading-6 whitespace-pre-line text-muted-foreground">
                  {effect.description || "效果说明未提供"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border bg-muted/30 px-5 py-6 text-sm text-muted-foreground">
          特殊效果未提供
        </p>
      )}
    </section>
  );
}

export function DishRequirementSource({
  requirement,
}: {
  requirement: DishItem["difficultyRequirement"];
}) {
  if (requirement === null) return null;
  return (
    <details className="group/requirement rounded-xl border bg-muted/20">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span>查看解锁条件原始表达式</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-open/requirement:rotate-180"
        />
      </summary>
      <code className="block border-t px-4 py-3 text-xs leading-5 wrap-anywhere text-muted-foreground">
        {requirement.rawExpression}
      </code>
    </details>
  );
}
