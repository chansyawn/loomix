import * as React from "react";
import { Link } from "@tanstack/react-router";
import { site } from "@/site";
import { collectionNavigation, homeItem } from "@/features/layout/navigation";
import {
  Sidebar,
  SidebarContent,
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
          className="flex h-12 min-w-0 items-center gap-2 rounded-lg px-2 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <img
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-full object-cover"
          />
          <span className="whitespace-nowrap">{site.name}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 pt-2">
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
        </SidebarMenu>
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
    </Sidebar>
  );
}
