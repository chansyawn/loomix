import { cn } from "cn";
import { useState } from "react";
import { ImageOffIcon } from "lucide-react";
import { QualityBar } from "./quality";
import { resourceUrl } from "@/infrastructure/resources";
import type { InspoCardFaceData } from "./inspo-card";

const frameRatio = 390 / 560;

export function InspoCardFace({
  background,
  foreground,
  quality,
  productName,
  className,
}: InspoCardFaceData & { productName: string; className?: string }) {
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [foregroundFailed, setForegroundFailed] = useState(false);
  const backdrop = backgroundFailed ? null : background;
  const backdropRatio = backdrop ? backdrop.width / backdrop.height : frameRatio;

  return (
    <div className={cn("grid aspect-39/56 w-full place-items-center", className)}>
      <figure
        className={cn("@container relative overflow-hidden", !backdrop && "rounded-md bg-muted")}
        style={{
          aspectRatio: backdropRatio,
          width: `${Math.min(1, backdropRatio / frameRatio) * 100}%`,
        }}
      >
        {backdrop ? (
          <img
            src={resourceUrl(backdrop.file)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBackgroundFailed(true)}
            className="absolute inset-0 size-full object-contain"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute top-[43%] left-1/2 grid aspect-square w-[86%] -translate-1/2 place-items-center"
        >
          {foreground && !foregroundFailed ? (
            <img
              src={resourceUrl(foreground)}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setForegroundFailed(true)}
              className="size-full object-contain"
            />
          ) : (
            <ImageOffIcon className="size-5 text-muted-foreground opacity-60" />
          )}
        </div>
        <QualityBar
          quality={quality}
          className="inset-x-[10%] bottom-[3%] h-[2%] overflow-hidden rounded-full after:absolute after:inset-0 after:bg-white/25"
        />
        <figcaption
          className={cn(
            "absolute inset-x-[6%] top-[80%] bottom-[2%] grid place-items-center px-[3%] pb-[3.5%] text-center text-[8.5cqw] leading-tight font-semibold text-white",
            (!backdrop || backdropRatio !== frameRatio) && "rounded-sm bg-black/80",
          )}
        >
          <span className="line-clamp-2 wrap-anywhere">{productName}</span>
        </figcaption>
      </figure>
    </div>
  );
}
