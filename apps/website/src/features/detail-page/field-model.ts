import type { LinkComponentProps } from "@tanstack/react-router";
import type { DishItem } from "../omnidex-view";
import type { ShopPurchaseQuotes } from "../omnidex/purchase-quotes";
import type { neighborAvatar } from "../neighbors/portrait";

type Destination = LinkComponentProps<"a">;
export type DetailTag = { key: string | number; name: string; destination?: Destination };
export type DetailEntry = {
  key: string | number;
  name: string;
  image: string | null;
  destination?: Destination;
  note?: string;
  links?: readonly { id: number; name: string; destination: Destination }[];
};
export type NeighborAvatar = ReturnType<typeof neighborAvatar>;

export type DetailField = { label: string; anchor?: string; fullWidth?: boolean } & (
  | { kind: "text"; value: string | null | undefined }
  | { kind: "quantity"; value: string | number | null; hash?: string }
  | { kind: "hint"; value: string | null; retry?: () => void; live?: boolean }
  | { kind: "tags"; value: readonly DetailTag[] }
  | {
      kind: "neighbors";
      value: readonly (NeighborAvatar & { caption?: string })[];
      hash?: string;
      note?: string;
    }
  | { kind: "entries"; value: readonly DetailEntry[]; moreLabel?: string; note?: string }
  | { kind: "effects"; value: NonNullable<DishItem["effects"]> }
  | { kind: "prices"; value: readonly ShopPurchaseQuotes[] }
);

export type DetailFieldGroup = {
  title: string;
  anchor?: string;
  titleHint?: string;
  fields: readonly DetailField[];
};

export function textField(label: string, value: string | null | undefined): DetailField {
  return { kind: "text", label, value };
}

export function quantityField(
  label: string,
  value: string | number | null,
  hash?: string,
): DetailField {
  return { kind: "quantity", label, value, hash };
}

export function hintField(label: string, value: string | null): DetailField {
  return { kind: "hint", label, value };
}
