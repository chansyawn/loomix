import type { CatalogEntryRow } from "./catalog";
import type { EntryOverview } from "./entry-overview";
import { CatalogTitleMetadata, overviewFieldGroups } from "./overview-fields";
import type { CatalogEntryDetail } from "./catalog-entry-detail";
import type { ShopPurchaseQuotes } from "./purchase-quotes";
import { DetailPage } from "@/features/detail-page/detail-page";
import { findWikiScroll, wikiScrollId } from "@/infrastructure/wiki-scroll";
import { clothingDetailPresentation } from "../clothing/detail-presentation";
import type { HairDyeingRegion, ReadHairDyeing } from "../clothing/hair-dyeing";
import { useDetailResource, type DetailResourceState } from "../detail-page/use-detail-resource";
import type { readOutfitNeighbor } from "../neighbor-outfit/detail";
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
  giftPreferenceGroup,
  outfitOwnerFields,
  relatedVignetteFields,
  RelationLoadError,
} from "./item-relation-presentation";
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
  readOwner?: () => ReturnType<typeof readOutfitNeighbor>;
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
  const owner = useDetailResource(readOwner, beforeRelationsChange);
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
  }, [hash, gifts, islets, vignettes, flowerDyeing, owner]);
  const useSections =
    uses &&
    gameplayUseSections(
      { ...uses, vignette: vignettes?.status === "ready" ? vignettes.value.placements : [] },
      vignettes?.status === "error" && (
        <RelationLoadError label="小栖地布景用途" retry={vignettes.retry} />
      ),
    );
  const hairDyeing = useDetailResource(readHairDyeing);
  const presentation = catalogDetailPresentation(model, overview.detailTags, hairDyeing);
  const { image, classification, sections, titleActions, navigation } = presentation;
  const detailSections = [...sections];
  const hints = explorationSection(islets);
  if (hints) detailSections.push(hints);
  const groups = overviewFieldGroups(
    overview,
    presentation,
    [
      ...outfitOwnerFields(owner),
      ...(model.category === "creatures" && model.detail.kind === "item"
        ? relatedVignetteFields(vignettes)
        : []),
      { kind: "prices", label: "购买报价（每次）", value: quotes ?? [], anchor: "purchase-offers" },
    ],
    giftPreferenceGroup(gifts),
  );
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
  tags: EntryOverview["detailTags"],
  hairDyeing: DetailResourceState<HairDyeingRegion[]> | undefined,
): CatalogDetailPresentation {
  switch (model.category) {
    case "furniture":
      return furnitureDetailPresentation(model.detail, tags);
    case "clothing":
      return clothingDetailPresentation(model.detail, hairDyeing);
    case "creatures":
      return creaturesDetailPresentation(model.detail);
    case "plants":
      return plantsDetailPresentation(model.detail, tags.origin);
    case "dishes":
      return dishesDetailPresentation(model.detail, tags.origin);
    case "miscellaneous":
      return miscellaneousDetailPresentation(model.detail);
  }
}
