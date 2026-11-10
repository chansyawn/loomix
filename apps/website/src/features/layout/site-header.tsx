import { useRouterState } from "@tanstack/react-router";
import { NeighborsReturnLink } from "@/features/neighbors/navigation";
import {
  CollectionReturnLink,
  collectionOrigin,
  collectionListPath,
} from "@/features/collection/navigation";
import { collectionNavigation, homeItem } from "./navigation";
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
  const { pathname, origin, detailTitle } = useRouterState({
    select: (state) => {
      const data: unknown = state.matches.at(-1)?.loaderData;
      const record: unknown =
        data && typeof data === "object" && "record" in data ? data.record : data;
      return {
        pathname: state.location.pathname,
        origin: collectionOrigin(state.location),
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
  const detail = pathname.startsWith("/collections/records/");
  const neighborDetail = /^\/neighbors\/[^/]+\/?$/.test(pathname);
  const listPath = detail ? collectionListPath(origin?.href ?? "/collections/all") : pathname;
  const collection = collectionNavigation.items.find((item) => item.to === listPath);
  const title =
    collection?.title ??
    (pathname === "/neighbors" ? "友邻" : pathname === "/" ? homeItem.title : "页面未找到");
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" aria-label="切换侧栏" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <Breadcrumb aria-label="页面导航">
        <BreadcrumbList>
          {collection && (
            <>
              <BreadcrumbItem className="hidden md:inline-flex">
                {collectionNavigation.title}
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          {detail && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink render={<CollectionReturnLink />}>
                  {collection?.title ?? "全部"}
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
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage>
              {detail || neighborDetail ? (detailTitle ?? "详情") : title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
