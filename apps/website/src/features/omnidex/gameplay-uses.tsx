import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { Badge } from "@/ui/components/badge";
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

const wideLayout = "(min-width: 40rem)";
function subscribeToLayout(onChange: () => void) {
  const media = window.matchMedia(wideLayout);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const isWideLayout = () => window.matchMedia(wideLayout).matches;

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
  const wide = useSyncExternalStore(subscribeToLayout, isWideLayout, () => false);
  const categories = visibleGameplayUseCategories(uses);
  const activeCategory = activeGameplayUseCategory(categories, savedCategory);
  if (!activeCategory) return null;

  return (
    <section aria-labelledby="gameplay-uses" className="flex min-w-0 flex-col gap-3">
      <h2 id="gameplay-uses" className="text-lg font-semibold">
        用途
      </h2>
      <div className="rounded-2xl border bg-muted/30">
        <Tabs
          value={activeCategory}
          orientation={wide ? "vertical" : "horizontal"}
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
          className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]"
        >
          <div className="border-b p-2 sm:border-r sm:border-b-0">
            <TabsList
              aria-label="用途分类"
              className="h-auto max-w-full flex-wrap justify-start sm:w-full sm:items-stretch"
            >
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="min-h-10 flex-none sm:justify-between"
                >
                  {gameplayUseLabels[category]}
                  <Badge variant="secondary">{uses[category].length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {categories.map((category) => (
            <TabsContent key={category} value={category} className="min-w-0">
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3 p-3 sm:p-4">
                {uses[category].map((use) => (
                  <GameplayUseCard key={use.id} use={use} />
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function GameplayUseCard({ use }: { use: GameplayUse }) {
  const origin = useOmnidexOrigin();
  return (
    <li className="min-w-0 rounded-xl border bg-background p-2">
      <GameplayRelationItem name={use.name} image={use.image} destination={use.destination} />
      <ul className="mt-1 flex flex-col">
        {use.conditions.map(({ hash, label, reason }) => (
          <li key={`${hash}:${reason}`}>
            <Link
              {...use.destination}
              hash={hash}
              state={{ omnidexOrigin: origin }}
              className="group flex min-h-11 items-start justify-between gap-2 rounded-lg p-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="min-w-0 wrap-anywhere">
                <span className="block font-medium group-hover:underline">{label}</span>
                <span className="block text-xs text-muted-foreground">{reason}</span>
              </span>
              <ArrowRightIcon
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}
