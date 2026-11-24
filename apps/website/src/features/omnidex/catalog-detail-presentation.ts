import type { DetailField, DetailPageProps } from "@/features/detail-page/detail-page";
import type { DetailNavigationModel } from "./detail-navigation-model";

export type CatalogDetailPresentation = Pick<
  DetailPageProps,
  "image" | "description" | "fields" | "sections" | "titleActions"
> & {
  navigation?: DetailNavigationModel;
  showEmptyExtras?: boolean;
};

export function mergeDetailFields(fields: readonly DetailField[], common: readonly DetailField[]) {
  const labels = new Set(fields.map(([label]) => label));
  return [...fields, ...common.filter(([label]) => !labels.has(label))];
}
