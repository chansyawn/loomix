import type { DetailSubsection } from "../detail-page/detail-headings";
import type { DetailSection } from "../detail-page/detail-page";
import type { DetailResourceState } from "../detail-page/use-detail-resource";
import type { ItemRelationReaders } from "./item-relations";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { CollapsibleContent } from "@/ui/components/collapsible";
import { CatalogItemCard } from "./catalog-item-card";
import { GameplayRelationItem } from "./gameplay-relation-item";

type RelationState<Key extends keyof ItemRelationReaders> =
  | DetailResourceState<Awaited<ReturnType<ItemRelationReaders[Key]>>>
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

export function giftSubsection(state: RelationState<"gifts">): DetailSubsection | undefined {
  const heading = { id: "gameplay-uses-gifts", title: "送礼" };
  if (state?.status === "error")
    return { ...heading, content: <RelationLoadError label="送礼偏好" retry={state.retry} /> };
  if (state?.status !== "ready" || !state.value.length) return;
  return {
    ...heading,
    content: (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">以下友邻的送礼偏好明确列出了此物品。</p>
        <dl className="grid gap-3">
          {state.value.map(({ level, name, neighbors }) => (
            <div key={level} className="grid gap-1">
              <dt className="text-sm font-medium">{name}</dt>
              <dd>
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {neighbors.map((neighbor) => (
                    <li key={neighbor.id}>
                      <GameplayRelationItem
                        {...neighbor}
                        variant="inline"
                        destination={{
                          to: "/neighbors/$id",
                          params: { id: String(neighbor.id) },
                          hash: `preference-${level}`,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  };
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
      <p className="text-sm text-muted-foreground">
        这些星屿的探索提示列出了此物品，实际产出受探索条件影响。
      </p>
    ),
    subsections: kinds.flatMap(([kind, title, hash]) => {
      const matches = hints.filter((islet) => islet[kind]);
      if (!matches.length) return [];
      const cards = matches.map((islet) => (
        <li key={islet.id} className="min-w-0">
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
        </li>
      ));
      const previewCount = 4;
      return [
        {
          id: `${heading.id}-${hash}`,
          title,
          headingTrailing: <Badge variant="secondary">{matches.length}</Badge>,
          disclosure: cards.length > previewCount ? { total: cards.length } : undefined,
          content: (
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3">
              {cards.slice(0, previewCount)}
              {cards.length > previewCount && (
                <CollapsibleContent render={<li />} className="col-span-full">
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3">
                    {cards.slice(previewCount)}
                  </ul>
                </CollapsibleContent>
              )}
            </ul>
          ),
        },
      ];
    }),
  };
}

export function relatedVignettesSection(
  state: RelationState<"vignettes">,
): DetailSection | undefined {
  const heading = { id: "related-vignettes", title: "关联小栖地" };
  if (state?.status === "error")
    return { ...heading, content: <RelationLoadError label={heading.title} retry={state.retry} /> };
  if (state?.status !== "ready" || !state.value.related.length) return;
  return {
    ...heading,
    content: (
      <ul className="grid gap-2 sm:grid-cols-2">
        {state.value.related.map((template) => (
          <li key={template.id}>
            <GameplayRelationItem
              {...template}
              destination={{
                to: "/vignettes/$id",
                params: { id: String(template.id) },
                hash: "related-creatures",
              }}
            />
          </li>
        ))}
      </ul>
    ),
  };
}
