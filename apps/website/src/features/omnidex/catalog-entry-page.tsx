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
import { gameplayUsesSection } from "./gameplay-uses";
import type { catalogGameplayUses } from "./gameplay-uses-model";
import type { ItemRelationReaders } from "./item-relations";
import {
  explorationSection,
  giftSubsection,
  relatedVignettesSection,
  RelationLoadError,
} from "./item-relation-sections";
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
  }, [hash, gifts, islets, vignettes]);
  const usesSection =
    uses &&
    gameplayUsesSection(
      { ...uses, vignette: vignettes?.status === "ready" ? vignettes.value.placements : [] },
      giftSubsection(gifts),
      vignettes?.status === "error" && (
        <RelationLoadError label="小栖地布景用途" retry={vignettes.retry} />
      ),
    );
  const hairDyeing = useDetailResource(readHairDyeing);
  const presentation = catalogDetailPresentation(model, hairDyeing);
  const { image, classification, sections, titleActions, navigation, showEmptyExtras } =
    presentation;
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
        titleMetadata={<CatalogTitleMetadata row={record} classification={classification} />}
        description={
          record.description && (
            <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
              {record.description}
            </p>
          )
        }
        fields={{ groups }}
        sections={detailSections}
        relatedNavigation={catalogEntryNavigation(navigation, record.id, origin)}
        empty={showEmptyExtras && <CatalogDetailEmpty />}
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
