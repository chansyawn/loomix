import { cn } from "cn";
import { ImageOffIcon } from "lucide-react";
import { useState } from "react";
import { resourceUrl } from "@/infrastructure/resources";

const insetClass = { none: "", sm: "p-1", lg: "p-5" } as const;

export function RecordImage({
  image,
  name,
  fit = "contain",
  inset = "lg",
  background = "muted",
  fallback = "label",
  eager = false,
  className,
}: {
  image: string | null;
  name: string;
  fit?: "contain" | "cover";
  inset?: "none" | "sm" | "lg";
  background?: "muted" | "none";
  fallback?: "label" | "icon";
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden",
        background === "muted" && "bg-muted",
        className,
      )}
    >
      {image && !failed ? (
        <img
          src={resourceUrl(image)}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "size-full",
            fit === "cover" ? "object-cover" : "object-contain",
            insetClass[inset],
          )}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOffIcon className={cn(fallback === "icon" ? "size-4" : "size-7", "opacity-40")} />
          {fallback === "label" && <span className="text-xs">暂无图片</span>}
        </div>
      )}
    </div>
  );
}
