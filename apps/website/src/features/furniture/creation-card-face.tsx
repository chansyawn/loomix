import { useState } from "react";
import { ImageOffIcon } from "lucide-react";
import { resourceUrl } from "@/infrastructure/resources";
import type { CreationCardFaceData } from "./creation-card";

const frameRatio = 390 / 560;

export function CreationCardFace({ background, foreground }: CreationCardFaceData) {
  const [failed, setFailed] = useState(false);
  return (
    <div aria-hidden="true" className="grid aspect-39/56 w-24 shrink-0 place-items-center">
      {background && foreground && !failed ? (
        <div
          className="relative"
          style={{
            aspectRatio: `${background.width} / ${background.height}`,
            width: `${Math.min(1, background.width / background.height / frameRatio) * 100}%`,
          }}
        >
          <img
            src={resourceUrl(background.file)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="block size-full object-contain"
          />
          <img
            src={resourceUrl(foreground)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute top-[43%] left-1/2 aspect-square w-[61%] -translate-1/2 object-contain"
          />
        </div>
      ) : (
        <div className="grid size-full place-items-center rounded-md bg-muted text-muted-foreground">
          <ImageOffIcon className="size-5 opacity-40" />
        </div>
      )}
    </div>
  );
}
