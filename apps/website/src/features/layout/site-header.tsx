import { useRouterState } from "@tanstack/react-router";

import { collectionNavigation, homeItem } from "@/features/layout/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/components/breadcrumb";
import { Separator } from "@/ui/components/separator";
import { SidebarTrigger } from "@/ui/components/sidebar";

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const collectionItem = collectionNavigation.items.find((item) => item.to === pathname);
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
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
