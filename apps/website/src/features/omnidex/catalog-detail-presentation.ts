import type { DetailField, DetailPageProps } from "@/features/detail-page/detail-page";
import type { DetailFieldGroup } from "../detail-page/detail-fields";
import type { DetailNavigationModel } from "./detail-navigation-model";

export type CatalogDetailPresentation = Pick<
  DetailPageProps,
  "image" | "sections" | "titleActions"
> & {
  classification?: string | null;
  fields?: readonly DetailField[];
  typeSpecificGroup?: DetailFieldGroup;
  navigation?: DetailNavigationModel;
};
