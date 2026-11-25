import type { ComponentProps } from "react";
import { cn } from "@/ui/lib/utils";

export function TableFrame({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 overflow-hidden rounded-md border", className)} {...props} />;
}
