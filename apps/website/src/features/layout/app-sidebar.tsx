import * as React from "react";
import {
  HomeIcon,
  ArmchairIcon,
  SproutIcon,
  BugIcon,
  PackageIcon,
  ShirtIcon,
  CookingPotIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

const navItems = [
  { title: "家具", to: "/collection/furniture", icon: ArmchairIcon },
  { title: "植物", to: "/collection/plants", icon: SproutIcon },
  { title: "生物", to: "/collection/creatures", icon: BugIcon },
  { title: "杂物", to: "/collection/miscellany", icon: PackageIcon },
  { title: "服饰", to: "/collection/clothing", icon: ShirtIcon },
  { title: "菜肴", to: "/collection/dishes", icon: CookingPotIcon },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarContent>
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link
                  to="/"
                  activeOptions={{ exact: true }}
                  activeProps={{ "data-active": true }}
                />
              }
            >
              <HomeIcon />
              <span>首页</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel>万象收藏</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
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
