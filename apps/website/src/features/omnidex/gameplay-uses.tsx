import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DetailSubsection } from "@/features/detail-page/detail-headings";
import type { DetailSection } from "@/features/detail-page/detail-page";
import { Badge } from "@/ui/components/badge";
import { Card, CardContent, CardHeader } from "@/ui/components/card";
import { CollapsibleContent } from "@/ui/components/collapsible";
import { Item, ItemActions, ItemContent } from "@/ui/components/item";
import { GameplayRelationItem } from "./gameplay-relation-item";
import {
  gameplayUsesSectionId,
  gameplayUseSectionId,
  gameplayUseLabels,
  visibleGameplayUseCategories,
  type GameplayUse,
  type GameplayUseCategory,
} from "./gameplay-uses-model";
import { useOmnidexOrigin } from "./navigation";

const gameplayUsePreviewCount = 4;

export function gameplayUsesSection(
  uses: Record<GameplayUseCategory, GameplayUse[]>,
  gifts: DetailSubsection | undefined,
  vignetteError: ReactNode,
): DetailSection | undefined {
  const categories = visibleGameplayUseCategories(uses);
  const subsections: DetailSubsection[] = categories.map((category) => {
    const entries = uses[category];
    const preview = entries.slice(0, gameplayUsePreviewCount);
    const remaining = entries.slice(gameplayUsePreviewCount);
    return {
      id: gameplayUseSectionId(category),
      title: gameplayUseLabels[category],
      headingTrailing: <Badge variant="secondary">{entries.length}</Badge>,
      content: <GameplayUseGrid preview={preview} remaining={remaining} />,
      disclosure: remaining.length ? { total: entries.length } : undefined,
    };
  });
  if (vignetteError)
    subsections.push({
      id: gameplayUseSectionId("vignette"),
      title: gameplayUseLabels.vignette,
      content: vignetteError,
    });
  if (gifts) subsections.push(gifts);
  if (subsections.length) return { id: gameplayUsesSectionId, title: "用途", subsections };
}

function GameplayUseGrid({
  preview,
  remaining,
}: {
  preview: readonly GameplayUse[];
  remaining: readonly GameplayUse[];
}) {
  return (
    <div
      role="list"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3"
    >
      {preview.map((use) => (
        <GameplayUseCard key={use.id} use={use} />
      ))}
      {remaining.length > 0 && (
        <CollapsibleContent className="contents data-closed:hidden">
          {remaining.map((use) => (
            <GameplayUseCard key={use.id} use={use} />
          ))}
        </CollapsibleContent>
      )}
    </div>
  );
}

function GameplayUseCard({ use }: { use: GameplayUse }) {
  const origin = useOmnidexOrigin();
  return (
    <div role="listitem" className="min-w-0">
      <Card size="sm" className="h-full">
        <CardHeader>
          <GameplayRelationItem name={use.name} image={use.image} destination={use.destination} />
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1">
            {use.conditions.map(({ hash, summary, linkLabel }) => (
              <li key={`${hash}:${summary}:${linkLabel}`}>
                <Item
                  size="xs"
                  className="flex-nowrap"
                  render={
                    <Link {...use.destination} hash={hash} state={{ omnidexOrigin: origin }} />
                  }
                >
                  <ItemContent className="min-w-0">
                    <span className="font-medium wrap-anywhere">{summary}</span>
                    <span className="text-xs wrap-anywhere text-muted-foreground">{linkLabel}</span>
                  </ItemContent>
                  <ItemActions>
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </ItemActions>
                </Item>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
