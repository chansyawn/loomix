import * as React from "react";
import { Link } from "@tanstack/react-router";
import GithubIcon from "@/assets/icons/github.svg?react";
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
            <GithubIcon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
