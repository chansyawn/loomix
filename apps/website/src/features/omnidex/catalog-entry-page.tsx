import type { CatalogEntryRow } from "./catalog";
import type { CatalogEntryDetail } from "./catalog-entry-detail";
import { CatalogEntryContext } from "./catalog-entry-context";
import { FurnitureDetailPage } from "../furniture/detail-page";
import { ClothingDetailPage } from "../clothing/detail-page";
import { CreaturesDetailPage } from "../creatures/detail-page";
import { PlantsDetailPage } from "../plants/detail-page";
import { DishesDetailPage } from "../dishes/detail-page";
import { MiscellaneousDetailPage } from "../miscellaneous/detail-page";
import { GameplayUses, useVignetteGameplayUses } from "./gameplay-uses";
import type { catalogGameplayUses, GameplayUse } from "./gameplay-uses-model";
import { useElementScrollRestoration, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";

const usesSectionId = "gameplay-uses";

export function CatalogEntryPage({
  record,
  model,
  uses,
  readVignetteUses,
}: {
  record: CatalogEntryRow;
  model: CatalogEntryDetail;
  uses?: ReturnType<typeof catalogGameplayUses>;
  readVignetteUses?: () => Promise<GameplayUse[]>;
}) {
  const content = useRef<HTMLDivElement>(null);
  const restore = useElementScrollRestoration({ id: "wiki-content" });
  const hash = useRouterState({ select: (state) => state.location.hash });
  const pendingScroll = useRef<{ element: HTMLElement; from: number; to: number } | null>(null);
  const pendingUsesAnchor = useRef(false);
  const vignette = useVignetteGameplayUses(readVignetteUses, () => {
    pendingUsesAnchor.current = hash === usesSectionId && !document.getElementById(usesSectionId);
    const element = content.current?.closest<HTMLElement>(
      '[data-scroll-restoration-id="wiki-content"]',
    );
    if (!element || !restore) return;
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    if (restore.scrollY > maxScroll && element.scrollTop === maxScroll)
      pendingScroll.current = { element, from: maxScroll, to: restore.scrollY };
  });
  useLayoutEffect(() => {
    const scrollToUses = pendingUsesAnchor.current;
    pendingUsesAnchor.current = false;
    const scroll = pendingScroll.current;
    pendingScroll.current = null;
    if (scroll && scroll.element.scrollTop === scroll.from) scroll.element.scrollTop = scroll.to;
    else if (scrollToUses && hash === usesSectionId)
      document.getElementById(usesSectionId)?.scrollIntoView();
  }, [hash, vignette]);
  const usesSection =
    uses && (uses.crafting.length || uses.cooking.length || vignette.length)
      ? {
          id: usesSectionId,
          title: "用途",
          content: <GameplayUses itemId={record.id} uses={{ ...uses, vignette }} />,
        }
      : undefined;
  return (
    <CatalogEntryContext value={{ record, usesSection }}>
      <div ref={content}>
        <DetailContent model={model} />
      </div>
    </CatalogEntryContext>
  );
}
function DetailContent({ model }: { model: CatalogEntryDetail }) {
  switch (model.category) {
    case "furniture":
      return <FurnitureDetailPage detail={model.detail} />;
    case "clothing":
      return <ClothingDetailPage detail={model.detail} />;
    case "creatures":
      return <CreaturesDetailPage detail={model.detail} />;
    case "plants":
      return <PlantsDetailPage detail={model.detail} />;
    case "dishes":
      return <DishesDetailPage detail={model.detail} />;
    case "miscellaneous":
      return <MiscellaneousDetailPage detail={model.detail} />;
  }
}
