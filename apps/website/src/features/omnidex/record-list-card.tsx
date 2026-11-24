import type { ComponentProps } from "react";
import { ListCard } from "../list-page/list-card";
import { QualityBar } from "./quality";

export function RecordListCard({
  quality,
  ...props
}: Omit<ComponentProps<typeof ListCard>, "imageOverlay"> & {
  quality: number | null;
}) {
  return <ListCard {...props} imageOverlay={<QualityBar quality={quality} />} />;
}
