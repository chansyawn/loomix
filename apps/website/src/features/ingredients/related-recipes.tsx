import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { RecordImage } from "../collection/record-image";
import { useDishesOrigin } from "../dishes/detail-navigation";
import { effectSummary } from "../dishes/presentation";
import type { IngredientDishMatch } from "./model";

export function RecipeAssociationNotice({ unconfirmedCount = 0 }: { unconfirmedCount?: number }) {
  return (
    <p className="text-sm/6 text-muted-foreground">
      关联结果来自已解析的食材条件，仅表示可作为候选食材；仍需满足其他条件。用量与实际投放规则尚未确认。
      {unconfirmedCount > 0 &&
        `另有 ${unconfirmedCount} 道菜肴的食材条件未完整确认，未确认部分不参与匹配。`}
    </p>
  );
}

function RecipeMatch({ match }: { match: IngredientDishMatch }) {
  const origin = useDishesOrigin();
  const { dish, conditions } = match;
  return (
    <li className="min-w-0 border-b py-4 first:pt-0 last:border-0 last:pb-0">
      <Link
        to="/collection/dishes/items/$id"
        params={{ id: String(dish.id) }}
        state={{ dishesOrigin: origin }}
        className="group flex items-start gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="w-16 shrink-0 overflow-hidden rounded-xl">
          <RecordImage image={dish.image} name={dish.name} compact />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium group-hover:underline">{dish.name}</span>
            <ArrowUpRightIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </div>
          <p className="text-xs/5 text-muted-foreground">
            {[dish.difficulty, dish.cookware, effectSummary(dish)].filter(Boolean).join(" · ") ||
              "菜肴信息未提供"}
          </p>
          <ul
            className="space-y-1 text-xs/5 text-muted-foreground"
            aria-label={`${dish.name}匹配的食材条件`}
          >
            {conditions.map((condition) => (
              <li key={condition.position}>
                条件 {condition.position}：{condition.label}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </li>
  );
}

export function RelatedRecipes({
  matches,
  preview = false,
}: {
  matches: IngredientDishMatch[];
  preview?: boolean;
}) {
  if (matches.length === 0)
    return (
      <p className="rounded-xl border p-4 text-sm/6 text-muted-foreground">
        暂无匹配的已解析配方，不代表该食材不能用于烹饪。
      </p>
    );
  const visible = preview ? matches.slice(0, 3) : matches;
  return (
    <div className="space-y-4">
      <ul className="rounded-2xl border p-4 sm:p-5">
        {visible.map((match) => (
          <RecipeMatch key={match.dish.id} match={match} />
        ))}
      </ul>
      {preview && matches.length > visible.length && (
        <details className="rounded-2xl border p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
            查看其余 {matches.length - visible.length} 道关联菜肴
          </summary>
          <ul className="pt-5">
            {matches.slice(visible.length).map((match) => (
              <RecipeMatch key={match.dish.id} match={match} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
