import { useState } from "react";
import { ImageOffIcon } from "lucide-react";
import { resourceUrl } from "@/infrastructure/resources";

export function NeighborImage({
  image,
  name,
  eager = false,
  className = "",
}: {
  image: string | null;
  name: string;
  eager?: boolean;
  className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-muted/50 ${className}`}
    >
      {image && image !== failedImage ? (
        <img
          src={resourceUrl(image)}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedImage(image)}
          className="size-full object-contain"
        />
      ) : (
        <div
          role="img"
          aria-label={`${name}：暂无图片`}
          className="flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-xs text-muted-foreground"
        >
          <ImageOffIcon aria-hidden="true" className="size-7 opacity-40" />
          暂无图片
        </div>
      )}
    </div>
  );
}
