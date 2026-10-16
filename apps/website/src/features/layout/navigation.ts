import {
  ArmchairIcon,
  BugIcon,
  CookingPotIcon,
  HomeIcon,
  PackageIcon,
  ShirtIcon,
  SproutIcon,
} from "lucide-react";

export const homeItem = { title: "首页", to: "/", icon: HomeIcon } as const;

export const collectionNavigation = {
  title: "万象收藏",
  items: [
    { title: "家具", to: "/collection/furniture", icon: ArmchairIcon },
    { title: "植物", to: "/collection/plants", icon: SproutIcon },
    { title: "生物", to: "/collection/creatures", icon: BugIcon },
    { title: "杂物", to: "/collection/miscellany", icon: PackageIcon },
    { title: "服饰", to: "/collection/clothing", icon: ShirtIcon },
    { title: "菜肴", to: "/collection/dishes", icon: CookingPotIcon },
  ],
} as const;
