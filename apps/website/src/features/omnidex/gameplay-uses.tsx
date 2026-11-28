import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DetailSection } from "@/features/detail-page/detail-page";
import { Card, CardContent, CardHeader } from "@/ui/components/card";
import { RelationPreview } from "./relation-preview";
import { Item, ItemActions, ItemContent } from "@/ui/components/item";
import { GameplayRelationItem } from "./gameplay-relation-item";
import {
  gameplayUseSectionId,
  gameplayUseLabels,
  visibleGameplayUseCategories,
  type GameplayUse,
  type GameplayUseCategory,
} from "./gameplay-uses-model";
import { useOmnidexOrigin } from "./navigation";

export function gameplayUseSections(
  uses: Record<GameplayUseCategory, GameplayUse[]>,
  vignetteError: ReactNode,
): DetailSection[] {
  const categories = visibleGameplayUseCategories(uses);
  const sections: DetailSection[] = categories.map((category) => {
    const entries = uses[category];
    return {
      id: gameplayUseSectionId(category),
      title: gameplayUseLabels[category],
      count: entries.length,
      content: (
        <RelationPreview
          entries={entries}
          label={gameplayUseLabels[category]}
          renderEntry={(use) => <GameplayUseCard use={use} />}
        />
      ),
    };
  });
  if (vignetteError)
    sections.push({
      id: gameplayUseSectionId("vignette"),
      title: gameplayUseLabels.vignette,
      content: vignetteError,
    });
  return sections;
}

function GameplayUseCard({ use }: { use: GameplayUse }) {
  const origin = useOmnidexOrigin();
  return (
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
                render={<Link {...use.destination} hash={hash} state={{ omnidexOrigin: origin }} />}
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
  );
}
