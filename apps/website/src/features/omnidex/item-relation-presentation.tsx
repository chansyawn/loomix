import type { DetailSection } from "../detail-page/detail-page";
import type { DetailResourceState } from "../detail-page/use-detail-resource";
import type { ItemRelationReaders } from "./item-relations";
import { Button } from "@/ui/components/button";
import { RelationPreview } from "./relation-preview";
import { CatalogItemCard } from "./catalog-item-card";
import { GameplayRelationItem } from "./gameplay-relation-item";

type RelationState<Key extends keyof ItemRelationReaders> =
  | DetailResourceState<Awaited<ReturnType<NonNullable<ItemRelationReaders[Key]>>>>
  | undefined;

export function RelationLoadError({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {label}暂时无法加载
      <Button variant="link" size="sm" onClick={retry}>
        重试
      </Button>
    </div>
  );
}

export function giftPreferenceValue(state: RelationState<"gifts">) {
  if (state?.status === "error") return <RelationLoadError label="送礼偏好" retry={state.retry} />;
  if (state?.status !== "ready" || !state.value.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {state.value.flatMap(({ level, name, neighbors }) =>
        neighbors.map((neighbor) => (
          <li key={`${level}-${neighbor.id}`}>
            <GameplayRelationItem
              {...neighbor}
              variant="inline"
              note={name}
              destination={{
                to: "/neighbors/$id",
                params: { id: String(neighbor.id) },
                hash: `preference-${level}`,
              }}
            />
          </li>
        )),
      )}
    </ul>
  );
}

export function explorationSection(state: RelationState<"islets">): DetailSection | undefined {
  const heading = { id: "islet-exploration-hints", title: "星屿探索提示" };
  if (state?.status === "error")
    return { ...heading, content: <RelationLoadError label={heading.title} retry={state.retry} /> };
  if (state?.status !== "ready" || !state.value.length) return;
  const hints = state.value;
  const kinds = [
    ["creature", "生物", "creatures"],
    ["specialty", "特产", "specialties"],
  ] as const;
  return {
    ...heading,
    content: (
      <div className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          这些星屿的探索提示列出了此物品，实际产出受探索条件影响。
        </p>
        {kinds.map(([kind, title, hash]) => {
          const matches = hints.filter((islet) => islet[kind]);
          if (!matches.length) return null;
          return (
            <div key={kind} className="grid gap-2">
              <h3 className="text-sm font-medium">
                {title} · {matches.length}
              </h3>
              <RelationPreview
                entries={matches}
                label={`${title}提示`}
                renderEntry={(islet) => (
                  <CatalogItemCard
                    itemId={islet.id}
                    item={islet}
                    description={islet.regions
                      .map(({ name, exploration, encounter }) =>
                        [name, exploration && "常规探索", encounter && "邂逅候选"]
                          .filter(Boolean)
                          .join(" · "),
                      )
                      .join("\n")}
                    fullDescription
                    link={{ to: "/starsea/islets/$id", params: { id: String(islet.id) }, hash }}
                  />
                )}
              />
            </div>
          );
        })}
      </div>
    ),
  };
}

export function relatedVignettesValue(state: RelationState<"vignettes">) {
  if (state?.status === "error")
    return <RelationLoadError label="关联小栖地" retry={state.retry} />;
  if (state?.status !== "ready" || !state.value.related.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {state.value.related.map((template) => (
        <li key={template.id}>
          <GameplayRelationItem
            {...template}
            variant="inline"
            destination={{
              to: "/vignettes/$id",
              params: { id: String(template.id) },
              hash: "related-creatures",
            }}
          />
        </li>
      ))}
    </ul>
  );
}
