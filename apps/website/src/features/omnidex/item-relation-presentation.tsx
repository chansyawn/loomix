import type { DetailSection } from "../detail-page/detail-page";
import type { DetailResourceState } from "../detail-page/use-detail-resource";
import type { ItemRelationReaders } from "./item-relations";
import { Button } from "@/ui/components/button";
import { RelationPreview } from "./relation-preview";
import { CatalogItemCard } from "./catalog-item-card";
import type { DetailField, DetailFieldGroup } from "../detail-page/field-model";
import type { readOutfitNeighbor } from "../neighbor-outfit/detail";

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

function loadErrorField(label: string, retry: () => void): DetailField {
  return { kind: "hint", label, value: "暂时无法加载", retry };
}

export function outfitOwnerFields(
  state: DetailResourceState<Awaited<ReturnType<typeof readOutfitNeighbor>>> | undefined,
): DetailField[] {
  if (!state) return [];
  const label = "所属友邻";
  if (state.status === "error") return [loadErrorField(label, state.retry)];
  if (state.status === "loading")
    return [{ kind: "hint", label, value: "正在加载友邻", live: true }];
  return state.value
    ? [{ kind: "neighbors", label, value: [state.value] }]
    : [{ kind: "hint", label, value: "友邻资料暂未收录" }];
}

export function giftPreferenceGroup(state: RelationState<"gifts">): DetailFieldGroup | undefined {
  const heading = { anchor: "gift-preferences", title: "送礼偏好" };
  if (state?.status === "error")
    return { ...heading, fields: [loadErrorField("友邻偏好", state.retry)] };
  if (state?.status !== "ready" || !state.value.length) return;
  const ids = state.value.flatMap(({ neighbors }) => neighbors.map(({ id }) => id));
  return {
    ...heading,
    titleHint:
      new Set(ids).size < ids.length
        ? "同一位友邻可能出现在多栏。比如，一件家具既有木头又有玻璃，友邻可能对木头有好感、对玻璃反感。头像旁会标出各自的原因。"
        : undefined,
    fields: state.value.map(({ level, name, neighbors }) => ({
      kind: "neighbors",
      label: name,
      anchor: `gift-${level}`,
      hash: `preference-${level}`,
      fullWidth: true,
      value: neighbors.map(({ specified, tags, ...neighbor }) => ({
        ...neighbor,
        caption: [...(specified ? ["指定物品"] : []), ...tags].join("、"),
      })),
    })),
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

export function relatedVignetteFields(state: RelationState<"vignettes">): DetailField[] {
  const label = "关联小栖地";
  if (state?.status === "error") return [loadErrorField(label, state.retry)];
  if (state?.status !== "ready") return [];
  return [
    {
      kind: "entries",
      label,
      value: state.value.related.map((template) => ({
        key: template.id,
        name: template.name,
        image: template.image,
        destination: {
          to: "/vignettes/$id",
          params: { id: String(template.id) },
          hash: "related-creatures",
        },
      })),
    },
  ];
}
