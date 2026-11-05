import * as React from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/site";
import { collectionNavigation, homeItem, neighborsItem } from "@/features/layout/navigation";
import { Button } from "@/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <Link
          to={homeItem.to}
          className="flex h-12 min-w-0 items-center gap-3 rounded-lg px-2 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <img
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full object-cover"
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate leading-none">{site.name}</span>
            <span className="truncate text-xs leading-none font-normal text-sidebar-foreground/65">
              {site.domain}
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link
                    to={homeItem.to}
                    activeOptions={{ exact: true }}
                    activeProps={{ "data-active": true }}
                  />
                }
              >
                <homeItem.icon />
                <span>{homeItem.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to={neighborsItem.to} activeProps={{ "data-active": true }} />}
              >
                <neighborsItem.icon />
                <span>{neighborsItem.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{collectionNavigation.title}</SidebarGroupLabel>
          <SidebarMenu>
            {collectionNavigation.items.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={<Link to={item.to} activeProps={{ "data-active": true }} />}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-1 px-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="GitHub"
            title="GitHub"
            render={
              <a
                href="https://github.com/chansyawn/loomix"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-4">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
