import {
  ArmchairIcon,
  BugIcon,
  CookingPotIcon,
  HomeIcon,
  PackageIcon,
  ShirtIcon,
  SproutIcon,
  UsersRoundIcon,
} from "lucide-react";

export const homeItem = { title: "首页", to: "/", icon: HomeIcon } as const;

export const collectionNavigation = {
  title: "万象收藏",
  items: [
    { title: "全部", to: "/collections/all", icon: PackageIcon },
    { title: "家具", to: "/collections/furniture", icon: ArmchairIcon },
    { title: "植物", to: "/collections/plants", icon: SproutIcon },
    { title: "生物", to: "/collections/creatures", icon: BugIcon },
    { title: "杂物", to: "/collections/miscellany", icon: PackageIcon },
    { title: "服饰", to: "/collections/clothing", icon: ShirtIcon },
    { title: "烹饪", to: "/collections/dishes", icon: CookingPotIcon },
  ],
} as const;

export const neighborsItem = { title: "友邻", to: "/neighbors", icon: UsersRoundIcon } as const;
