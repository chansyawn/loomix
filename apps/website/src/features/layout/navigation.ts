import {
  ArmchairIcon,
  BugIcon,
  CookingPotIcon,
  OrbitIcon,
  HomeIcon,
  MapPinnedIcon,
  PackageIcon,
  ShirtIcon,
  SproutIcon,
  UsersRoundIcon,
} from "lucide-react";

export const homeItem = { title: "首页", to: "/", icon: HomeIcon } as const;
export const catalogItem = { title: "全部", to: "/catalog", icon: PackageIcon } as const;

export const omnidexNavigation = {
  title: "万象收藏",
  items: [
    catalogItem,
    { title: "家具", to: "/furniture", icon: ArmchairIcon },
    { title: "植物", to: "/plants", icon: SproutIcon },
    { title: "生物", to: "/creatures", icon: BugIcon },
    { title: "杂物", to: "/miscellaneous", icon: PackageIcon },
    { title: "服饰", to: "/clothing", icon: ShirtIcon },
    { title: "烹饪", to: "/dishes", icon: CookingPotIcon },
  ],
} as const;

export const neighborsItem = { title: "友邻", to: "/neighbors", icon: UsersRoundIcon } as const;
export const starseaItem = { title: "星海", to: "/starsea", icon: OrbitIcon } as const;
export const vignettesItem = { title: "小栖地", to: "/vignettes", icon: MapPinnedIcon } as const;
