import { useRouterState } from "@tanstack/react-router";

import { CreaturesReturnLink } from "@/features/creatures/detail-navigation";
import { FurnitureReturnLink } from "@/features/furniture/detail-navigation";
import { ClothingReturnLink } from "@/features/clothing/detail-navigation";
import { PlantsReturnLink } from "@/features/plants/detail-navigation";
import { DishesReturnLink } from "@/features/dishes/detail-navigation";
import { MiscellanyReturnLink } from "@/features/miscellany/detail-navigation";
import { collectionNavigation, homeItem } from "@/features/layout/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/components/breadcrumb";
import { Separator } from "@/ui/components/separator";
import { SidebarTrigger } from "@/ui/components/sidebar";

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isFurnitureDetail = /^\/collection\/furniture\/(items|sets)\/[^/]+\/?$/.test(pathname);
  const clothingView = /^\/collection\/clothing\/(items|sets|appearances)\/[^/]+\/?$/.exec(
    pathname,
  )?.[1];
  const isClothingDetail = clothingView !== undefined;
  const creaturesView = /^\/collection\/creatures\/(items|series)\/[^/]+\/?$/.exec(pathname)?.[1];
  const isCreaturesDetail = creaturesView !== undefined;
  const plantsView = /^\/collection\/plants\/(items|series)\/[^/]+\/?$/.exec(pathname)?.[1];
  const isPlantsDetail = plantsView !== undefined;
  const dishesView = /^\/collection\/dishes\/(items|series)\/[^/]+\/?$/.exec(pathname)?.[1];
  const isDishesDetail = dishesView !== undefined;
  const isMiscellanyDetail = /^\/collection\/miscellany\/items\/[^/]+\/?$/.test(pathname);
  const isDetail =
    isFurnitureDetail ||
    isClothingDetail ||
    isCreaturesDetail ||
    isPlantsDetail ||
    isDishesDetail ||
    isMiscellanyDetail;
  const detailTitle = useRouterState({
    select: (state) => {
      const data: unknown = state.matches.at(-1)?.loaderData;
      if (
        data &&
        typeof data === "object" &&
        "record" in data &&
        data.record &&
        typeof data.record === "object" &&
        "name" in data.record &&
        typeof data.record.name === "string"
      )
        return data.record.name;
      if (data && typeof data === "object" && "name" in data && typeof data.name === "string")
        return data.name;
      return undefined;
    },
  });
  const collectionItem = collectionNavigation.items.find(
    (item) =>
      item.to === pathname ||
      (isFurnitureDetail && item.to === "/collection/furniture") ||
      (isClothingDetail && item.to === "/collection/clothing") ||
      (isCreaturesDetail && item.to === "/collection/creatures") ||
      (isPlantsDetail && item.to === "/collection/plants") ||
      (isDishesDetail && item.to === "/collection/dishes") ||
      (isMiscellanyDetail && item.to === "/collection/miscellany"),
  );
  const title = pathname === homeItem.to ? homeItem.title : (collectionItem?.title ?? "页面未找到");

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" aria-label="切换侧栏" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <Breadcrumb aria-label="页面导航">
        <BreadcrumbList>
          {collectionItem && (
            <>
              <BreadcrumbItem className="hidden md:inline-flex">
                {collectionNavigation.title}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          {isFurnitureDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <FurnitureReturnLink view={pathname.includes("/sets/") ? "sets" : "items"} />
                  }
                >
                  家具
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isClothingDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <ClothingReturnLink
                      view={
                        clothingView === "sets"
                          ? "sets"
                          : clothingView === "appearances"
                            ? "appearances"
                            : "items"
                      }
                    />
                  }
                >
                  服饰
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isCreaturesDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <CreaturesReturnLink view={creaturesView === "series" ? "series" : "items"} />
                  }
                >
                  生物
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isPlantsDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<PlantsReturnLink view={plantsView === "series" ? "series" : "items"} />}
                >
                  植物
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isDishesDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<DishesReturnLink view={dishesView === "series" ? "series" : "items"} />}
                >
                  菜肴
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {isMiscellanyDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<MiscellanyReturnLink />}>杂物</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="line-clamp-1">
              {isDetail
                ? (detailTitle ??
                  (isCreaturesDetail
                    ? "生物详情"
                    : isPlantsDetail
                      ? "植物详情"
                      : isClothingDetail
                        ? "服饰详情"
                        : isDishesDetail
                          ? "菜肴详情"
                          : isMiscellanyDetail
                            ? "杂物详情"
                            : "家具详情"))
                : title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
