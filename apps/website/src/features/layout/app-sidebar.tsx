import { useRouterState } from "@tanstack/react-router";
import { catalogEntryRouteId, omnidexReturnLocation } from "../omnidex/entry-location";
import { useOmnidexOrigin } from "../omnidex/navigation";
import * as React from "react";
import { Link } from "@tanstack/react-router";
import GithubIcon from "@/assets/icons/github.svg?react";
import { site } from "@/site";
import { SiteNoticePopover } from "./site-notice";
import {
  omnidexNavigation,
  homeItem,
  neighborsItem,
  starseaItem,
  vignettesItem,
} from "@/features/layout/navigation";
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
  const { detail, pathname } = useRouterState({
    select: (state) => ({
      detail: state.matches.some((match) => match.routeId === catalogEntryRouteId),
      pathname: state.location.pathname,
    }),
  });
  const origin = useOmnidexOrigin();
  const activePath = detail ? omnidexReturnLocation(origin).to : pathname;
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
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to={starseaItem.to} activeProps={{ "data-active": true }} />}
              >
                <starseaItem.icon />
                <span>{starseaItem.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to={vignettesItem.to} activeProps={{ "data-active": true }} />}
              >
                <vignettesItem.icon />
                <span>{vignettesItem.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{omnidexNavigation.title}</SidebarGroupLabel>
          <SidebarMenu>
            {omnidexNavigation.items.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={
                      <Link
                        to={item.to}
                        data-active={activePath === item.to || undefined}
                        activeOptions={{ exact: true }}
                      />
                    }
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
            nativeButton={false}
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
          <SiteNoticePopover />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
