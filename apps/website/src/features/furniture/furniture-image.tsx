import { ImageOffIcon } from "lucide-react";
import { useState } from "react";
import { resourceUrl } from "@/infrastructure/resources";

export function FurnitureImage({
  image,
  name,
  scene = false,
  eager = false,
}: {
  image: string | null;
  name: string;
  scene?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-muted ${scene ? "aspect-2/1" : "aspect-square"}`}
    >
      {image && !failed ? (
        <img
          src={resourceUrl(image)}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full ${scene ? "object-cover" : "object-contain p-5"}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOffIcon className="size-7 opacity-40" />
          <span className="text-xs">暂无图片</span>
        </div>
      )}
    </div>
  );
}
