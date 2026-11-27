import { useRouterState } from "@tanstack/react-router";
import { NeighborsReturnLink } from "@/features/neighbors/navigation";
import { StarseaReturnLink } from "@/features/starsea/navigation";
import { VignetteReturnLink } from "@/features/vignettes/navigation";
import { OmnidexReturnLink, useOmnidexOrigin } from "@/features/omnidex/navigation";
import { catalogEntryRouteId, omnidexReturnLocation } from "@/features/omnidex/entry-location";
import {
  omnidexNavigation,
  homeItem,
  neighborsItem,
  starseaItem,
  vignettesItem,
} from "./navigation";
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
  const { pathname, detail, detailTitle } = useRouterState({
    select: (state) => {
      const data: unknown = state.matches.at(-1)?.loaderData;
      const record: unknown =
        data && typeof data === "object" && "record" in data ? data.record : data;
      return {
        pathname: state.location.pathname,
        detail: state.matches.some((match) => match.routeId === catalogEntryRouteId),
        detailTitle:
          record &&
          typeof record === "object" &&
          "name" in record &&
          typeof record.name === "string"
            ? record.name
            : undefined,
      };
    },
  });
  const origin = useOmnidexOrigin();
  const neighborDetail = /^\/neighbors\/[^/]+\/?$/.test(pathname);
  const starseaDetail = /^\/starsea\/islets\/[^/]+\/?$/.test(pathname);
  const vignetteDetail = /^\/vignettes\/[^/]+\/?$/.test(pathname);
  const listPath = detail ? omnidexReturnLocation(origin).to : pathname;
  const omnidexItem = omnidexNavigation.items.find((item) => item.to === listPath);
  const title =
    omnidexItem?.title ??
    [homeItem, neighborsItem, starseaItem, vignettesItem].find((item) => item.to === pathname)
      ?.title ??
    "页面未找到";
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" aria-label="切换侧栏" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <Breadcrumb aria-label="页面导航">
        <BreadcrumbList>
          {omnidexItem && (
            <>
              <BreadcrumbItem className="hidden md:inline-flex">
                {omnidexNavigation.title}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          {detail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<OmnidexReturnLink />}>
                  {omnidexItem?.title ?? "全部"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {neighborDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<NeighborsReturnLink />}>友邻</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {starseaDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<StarseaReturnLink />}>{starseaItem.title}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {vignetteDetail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<VignetteReturnLink />}>
                  {vignettesItem.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage>
              {detail || neighborDetail || starseaDetail || vignetteDetail
                ? (detailTitle ?? "详情")
                : title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
