import type { DetailPageProps } from "@/features/detail-page/detail-page";
import type { DetailNavigationModel } from "./detail-navigation-model";

export type CatalogDetailPresentation = Pick<
  DetailPageProps,
  "image" | "fields" | "sections" | "titleActions"
> & {
  navigation?: DetailNavigationModel;
  showEmptyExtras?: boolean;
};
