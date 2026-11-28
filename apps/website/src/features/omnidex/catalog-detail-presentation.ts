import type { DetailField, DetailPageProps } from "@/features/detail-page/detail-page";
import type { DetailNavigationModel } from "./detail-navigation-model";

export type CatalogDetailPresentation = Pick<
  DetailPageProps,
  "image" | "sections" | "titleActions"
> & {
  classification?: string | null;
  fields?: readonly DetailField[];
  relatedFields?: readonly DetailField[];
  navigation?: DetailNavigationModel;
};
