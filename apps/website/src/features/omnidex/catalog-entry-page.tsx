import type { CatalogEntryRow } from "./catalog";
import type { EntryOverview } from "./entry-overview";
import { CatalogTitleMetadata, overviewFieldGroups } from "./overview-fields";
import type { CatalogEntryDetail } from "./catalog-entry-detail";
import { simplePurchaseQuote, type ShopPurchaseQuotes } from "./purchase-quotes";
import { RecordImage } from "./record-image";
import { DetailPage } from "@/features/detail-page/detail-page";
import { findWikiScroll, wikiScrollId } from "@/infrastructure/wiki-scroll";
import { clothingDetailPresentation } from "../clothing/detail-presentation";
import type { HairDyeingRegion, ReadHairDyeing } from "../clothing/hair-dyeing";
import { useDetailResource, type DetailResourceState } from "../detail-page/use-detail-resource";
import { OutfitOwner, type ReadOutfitOwner } from "../neighbor-outfit/owner";
import { creaturesDetailPresentation } from "../creatures/detail-presentation";
import { dishesDetailPresentation } from "../dishes/detail-presentation";
import { furnitureDetailPresentation } from "../furniture/detail-presentation";
import { miscellaneousDetailPresentation } from "../miscellaneous/detail-presentation";
import { plantsDetailPresentation } from "../plants/detail-presentation";
import type { CatalogDetailPresentation } from "./catalog-detail-presentation";
import { catalogEntryNavigation } from "./detail-navigation";
import { gameplayUseSections } from "./gameplay-uses";
import type { catalogGameplayUses } from "./gameplay-uses-model";
import type { ItemRelationReaders } from "./item-relations";
import {
  explorationSection,
  giftSection,
  relatedVignettesSection,
  RelationLoadError,
} from "./item-relation-sections";
import { useOmnidexOrigin } from "./navigation";
import { QualityMarker } from "./quality";
import { FlowerDyeingUses } from "../clothing/flower-dyeing-uses";
import { useElementScrollRestoration, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";

export function CatalogEntryPage({
  record,
  model,
  overview,
  readOwner,
  quotes,
  uses,
  relations,
  readHairDyeing,
}: {
  record: CatalogEntryRow;
  model: CatalogEntryDetail;
  overview: EntryOverview;
  readOwner?: ReadOutfitOwner;
  quotes?: ShopPurchaseQuotes[];
  uses?: ReturnType<typeof catalogGameplayUses>;
  relations?: ItemRelationReaders;
  readHairDyeing?: ReadHairDyeing;
}) {
  const content = useRef<HTMLDivElement>(null);
  const restore = useElementScrollRestoration({ id: wikiScrollId });
  const origin = useOmnidexOrigin();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const pendingScroll = useRef<{ element: HTMLElement; from: number; to: number } | null>(null);
  const pendingAnchor = useRef<string | undefined>(undefined);
  function beforeRelationsChange() {
    if (hash && !content.current?.querySelector(`#${CSS.escape(hash)}`))
      pendingAnchor.current = hash;
    const element = findWikiScroll(content.current);
    if (!element || !restore) return;
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
    if (restore.scrollY > maxScroll && element.scrollTop === maxScroll)
      pendingScroll.current = { element, from: maxScroll, to: restore.scrollY };
  }
  const gifts = useDetailResource(relations?.gifts, beforeRelationsChange);
  const islets = useDetailResource(relations?.islets, beforeRelationsChange);
  const vignettes = useDetailResource(relations?.vignettes, beforeRelationsChange);
  const flowerDyeing = useDetailResource(relations?.flowerDyeing, beforeRelationsChange);
  useLayoutEffect(() => {
    const target =
      hash && pendingAnchor.current === hash
        ? content.current?.querySelector(`#${CSS.escape(hash)}`)
        : null;
    pendingAnchor.current = undefined;
    const scroll = pendingScroll.current;
    pendingScroll.current = null;
    if (target) target.scrollIntoView();
    else if (scroll && scroll.element.scrollTop === scroll.from)
      scroll.element.scrollTop = scroll.to;
  }, [hash, gifts, islets, vignettes, flowerDyeing]);
  const useSections =
    uses &&
    gameplayUseSections(
      { ...uses, vignette: vignettes?.status === "ready" ? vignettes.value.placements : [] },
      giftSection(gifts),
      vignettes?.status === "error" && (
        <RelationLoadError label="小栖地布景用途" retry={vignettes.retry} />
      ),
    );
  const hairDyeing = useDetailResource(readHairDyeing);
  const presentation = catalogDetailPresentation(model, hairDyeing);
  const { image, classification, sections, titleActions, navigation } = presentation;
  const detailSections = [...sections];
  const hints = explorationSection(islets);
  if (hints) detailSections.push(hints);
  const habitats = model.category === "creatures" && relatedVignettesSection(vignettes);
  if (habitats) detailSections.push(habitats);
  const simpleQuote = simplePurchaseQuote(quotes);
  const groups = overviewFieldGroups(
    overview,
    presentation,
    readOwner && <OutfitOwner read={readOwner} />,
    simpleQuote,
  );
  if (!simpleQuote && quotes?.length)
    detailSections.push({
      id: "purchase-offers",
      title: "购买报价",
      content: (
        <dl className="grid gap-3">
          <div className="text-sm text-muted-foreground">
            <dt>配置报价</dt>
            <dd>以下为每次购买的金额。</dd>
          </div>
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
  if (useSections) detailSections.push(...useSections);
  if (
    flowerDyeing?.status === "error" ||
    (flowerDyeing?.status === "ready" && flowerDyeing.value.length)
  ) {
    detailSections.push({
      id: "flower-dyeing",
      title: "用于染发",
      content:
        flowerDyeing.status === "error" ? (
          <RelationLoadError label="花朵染发用途" retry={flowerDyeing.retry} />
        ) : (
          <FlowerDyeingUses groups={flowerDyeing.value} />
        ),
    });
  }
  return (
    <div ref={content}>
      <DetailPage
        image={image}
        title={record.name}
        titleLeading={record.quality !== null && <QualityMarker quality={record.quality} />}
        titleActions={titleActions}
        titleMetadata={<CatalogTitleMetadata row={record} classification={classification} />}
        description={
          record.description && (
            <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
              {record.description}
            </p>
          )
        }
        fieldGroups={groups}
        sections={detailSections}
        relatedNavigation={catalogEntryNavigation(navigation, record.id, origin)}
      />
    </div>
  );
}

function catalogDetailPresentation(
  model: CatalogEntryDetail,
  hairDyeing: DetailResourceState<HairDyeingRegion[]> | undefined,
): CatalogDetailPresentation {
  switch (model.category) {
    case "furniture":
      return furnitureDetailPresentation(model.detail);
    case "clothing":
      return clothingDetailPresentation(model.detail, hairDyeing);
    case "creatures":
      return creaturesDetailPresentation(model.detail, model.encounterSummary);
    case "plants":
      return plantsDetailPresentation(model.detail);
    case "dishes":
      return dishesDetailPresentation(model.detail);
    case "miscellaneous":
      return miscellaneousDetailPresentation(model.detail);
  }
}
