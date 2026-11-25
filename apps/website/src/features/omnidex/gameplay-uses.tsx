import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { Badge } from "@/ui/components/badge";
import { Card, CardContent, CardHeader } from "@/ui/components/card";
import { Item, ItemActions, ItemContent } from "@/ui/components/item";
import { Separator } from "@/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { GameplayRelationItem } from "./gameplay-relation-item";
import {
  activeGameplayUseCategory,
  gameplayUseLabels,
  visibleGameplayUseCategories,
  type GameplayUse,
  type GameplayUseCategory,
} from "./gameplay-uses-model";
import { useOmnidexOrigin } from "./navigation";

declare module "@tanstack/react-router" {
  interface HistoryState {
    gameplayUseCategory?: GameplayUseCategory;
  }
}

export function useVignetteGameplayUses(
  readUses: (() => Promise<GameplayUse[]>) | undefined,
  beforeShowingUses: () => void,
) {
  const [uses, setUses] = useState<GameplayUse[]>([]);
  const publishUses = useEffectEvent((results: GameplayUse[]) => {
    if (results.length) beforeShowingUses();
    setUses(results);
  });
  useEffect(() => {
    if (!readUses) return;
    const read = readUses;
    let current = true;
    async function loadUses() {
      try {
        const results = await read();
        if (current) publishUses(results);
      } catch {
        if (current) setUses([]);
      }
    }
    void loadUses();
    return () => {
      current = false;
    };
  }, [readUses]);
  return uses;
}

export function GameplayUses({
  itemId,
  uses,
}: {
  itemId: number;
  uses: Record<GameplayUseCategory, GameplayUse[]>;
}) {
  const router = useRouter();
  const savedCategory = useRouterState({
    select: (state) => state.location.state.gameplayUseCategory,
  });
  const categories = visibleGameplayUseCategories(uses);
  const activeCategory = activeGameplayUseCategory(categories, savedCategory);
  if (!activeCategory) return null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <Tabs
        value={activeCategory}
        onValueChange={(category: GameplayUseCategory) => {
          void router.navigate({
            to: "/catalog/$id",
            params: { id: String(itemId) },
            search: true,
            hash: true,
            resetScroll: false,
            hashScrollIntoView: false,
            replace: true,
            state: (previous) => ({ ...previous, gameplayUseCategory: category }),
          });
        }}
        className="grid"
      >
        <div className="min-w-0">
          <div className="p-3">
            <TabsList
              aria-label="用途分类"
              className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto"
            >
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {gameplayUseLabels[category]}
                  <Badge variant="secondary">{uses[category].length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Separator />
        </div>
        {categories.map((category) => (
          <TabsContent
            key={category}
            value={category}
            className={cn(
              "max-h-[min(60svh,32rem)] min-w-0 overflow-y-auto",
              categories.length > 1 && "h-112 scrollbar-gutter-stable",
            )}
          >
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3 p-3 pt-1">
              {uses[category].map((use) => (
                <GameplayUseCard key={use.id} use={use} />
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GameplayUseCard({ use }: { use: GameplayUse }) {
  const origin = useOmnidexOrigin();
  return (
    <li className="min-w-0">
      <Card size="sm" className="h-full">
        <CardHeader>
          <GameplayRelationItem name={use.name} image={use.image} destination={use.destination} />
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1">
            {use.conditions.map(({ hash, label, reason }) => (
              <li key={`${hash}:${reason}`}>
                <Item
                  size="xs"
                  className="flex-nowrap"
                  render={
                    <Link {...use.destination} hash={hash} state={{ omnidexOrigin: origin }} />
                  }
                >
                  <ItemContent className="min-w-0">
                    <span className="font-medium wrap-anywhere">{label}</span>
                    <span className="text-xs wrap-anywhere text-muted-foreground">{reason}</span>
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
    </li>
  );
}
