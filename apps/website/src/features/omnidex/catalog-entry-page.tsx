import { recordFields, type CatalogEntryRow } from "./catalog";
import type { CatalogEntryDetail } from "./catalog-entry-detail";
import type { ShopPurchaseQuotes } from "./purchase-quotes";
import { RecordImage } from "./record-image";
import { DetailPage } from "@/features/detail-page/detail-page";
import { findWikiScroll, wikiScrollId } from "@/infrastructure/wiki-scroll";
import { clothingDetailPresentation } from "../clothing/detail-presentation";
import type { ReadHairDyeing } from "../clothing/hair-dyeing";
import { useHairDyeing, type HairDyeingState } from "../clothing/use-hair-dyeing";
import { creaturesDetailPresentation } from "../creatures/detail-presentation";
import { dishesDetailPresentation } from "../dishes/detail-presentation";
import { furnitureDetailPresentation } from "../furniture/detail-presentation";
import { miscellaneousDetailPresentation } from "../miscellaneous/detail-presentation";
import { plantsDetailPresentation } from "../plants/detail-presentation";
import { mergeDetailFields, type CatalogDetailPresentation } from "./catalog-detail-presentation";
import { catalogEntryNavigation } from "./detail-navigation";
import { GameplayUses, useVignetteGameplayUses } from "./gameplay-uses";
import type { catalogGameplayUses, GameplayUse } from "./gameplay-uses-model";
import { useOmnidexOrigin } from "./navigation";
import { QualityMarker } from "./quality";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import { useElementScrollRestoration, useRouterState } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

const usesSectionId = "gameplay-uses";

export function CatalogEntryPage({
  record,
  model,
  quotes,
  uses,
  readVignetteUses,
  readHairDyeing,
}: {
  record: CatalogEntryRow;
  model: CatalogEntryDetail;
  quotes?: ShopPurchaseQuotes[];
  uses?: ReturnType<typeof catalogGameplayUses>;
  readVignetteUses?: () => Promise<GameplayUse[]>;
  readHairDyeing?: ReadHairDyeing;
}) {
  const content = useRef<HTMLDivElement>(null);
  const restore = useElementScrollRestoration({ id: wikiScrollId });
  const origin = useOmnidexOrigin();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const pendingScroll = useRef<{ element: HTMLElement; from: number; to: number } | null>(null);
  const pendingUsesAnchor = useRef(false);
  const vignette = useVignetteGameplayUses(readVignetteUses, () => {
    pendingUsesAnchor.current =
      hash === usesSectionId && !content.current?.querySelector(`#${usesSectionId}`);
    const element = findWikiScroll(content.current);
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
    if (scrollToUses && hash === usesSectionId)
      content.current?.querySelector(`#${usesSectionId}`)?.scrollIntoView();
    else if (scroll && scroll.element.scrollTop === scroll.from)
      scroll.element.scrollTop = scroll.to;
  }, [hash, vignette]);
  const usesSection =
    uses && (uses.crafting.length || uses.cooking.length || vignette.length)
      ? {
          id: usesSectionId,
          title: "用途",
          content: <GameplayUses itemId={record.id} uses={{ ...uses, vignette }} />,
        }
      : undefined;
  const hairDyeing = useHairDyeing(readHairDyeing);
  const { image, description, fields, sections, titleActions, navigation, showEmptyExtras } =
    catalogDetailPresentation(model, hairDyeing);
  const detailSections = [...sections];
  if (quotes?.length)
    detailSections.push({
      id: "purchase-offers",
      title: "配置报价（每次购买）",
      content: (
        <dl className="grid gap-3">
          {quotes.map(({ id, name, paymentNote, prices }) => (
            <div key={id} className="grid gap-1">
              <dt className="font-medium">{name}</dt>
              {prices.map(({ key, priceLabel, currencyImage, note }) => (
                <dd key={key} className="flex items-start gap-1.5">
                  {currencyImage && (
                    <RecordImage
                      image={currencyImage}
                      name=""
                      inset="none"
                      background="none"
                      fallback="icon"
                      className="mt-0.5 size-5 shrink-0"
                    />
                  )}
                  <span>
                    {priceLabel}
                    {note && <span className="text-muted-foreground">（{note}）</span>}
                  </span>
                </dd>
              ))}
              {paymentNote && <dd className="text-sm text-muted-foreground">{paymentNote}</dd>}
            </div>
          ))}
        </dl>
      ),
    });
  if (usesSection) detailSections.push(usesSection);
  return (
    <div ref={content}>
      <DetailPage
        image={image}
        title={record.name}
        titleLeading={record.quality !== null && <QualityMarker quality={record.quality} />}
        titleActions={titleActions}
        description={
          record.quality === null ? (
            <>
              <p className="text-sm text-muted-foreground">品阶：未提供</p>
              {description}
            </>
          ) : (
            description
          )
        }
        fields={mergeDetailFields(fields, recordFields(record))}
        sections={detailSections}
        relatedNavigation={catalogEntryNavigation(navigation, record.id, origin)}
        empty={showEmptyExtras && <CatalogDetailEmpty />}
      />
    </div>
  );
}

function catalogDetailPresentation(
  model: CatalogEntryDetail,
  hairDyeing: HairDyeingState | undefined,
): CatalogDetailPresentation {
  switch (model.category) {
    case "furniture":
      return furnitureDetailPresentation(model.detail);
    case "clothing":
      return clothingDetailPresentation(model.detail, hairDyeing);
    case "creatures":
      return creaturesDetailPresentation(model.detail);
    case "plants":
      return plantsDetailPresentation(model.detail);
    case "dishes":
      return dishesDetailPresentation(model.detail);
    case "miscellaneous":
      return miscellaneousDetailPresentation(model.detail);
  }
}

function CatalogDetailEmpty() {
  return (
    <Empty className="min-h-44">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InfoIcon />
        </EmptyMedia>
        <EmptyTitle>暂时没有更多的信息</EmptyTitle>
        <EmptyDescription>更多资料收录后会在这里展示</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
