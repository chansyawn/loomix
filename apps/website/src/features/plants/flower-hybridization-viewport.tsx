import { MoveHorizontalIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/components/button";

const zoomStep = 0.15;
const minManualScale = 0.25;
const maxManualScale = 1.5;
const minViewportHeight = 180;

type Point = { x: number; y: number };

function scrollToGraphPoint(
  viewport: HTMLDivElement,
  stage: HTMLDivElement,
  scale: number,
  point: Point,
) {
  viewport.scrollTo({
    left: point.x * scale + stage.offsetLeft - viewport.clientWidth / 2,
    top: point.y * scale + stage.offsetTop - viewport.clientHeight / 2,
  });
}

export function FlowerHybridizationViewport({
  width,
  height,
  label,
  children,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomCenterRef = useRef<Point>(null);
  const [availableWidth, setAvailableWidth] = useState<number>();
  const [manualScale, setManualScale] = useState<number>();
  const fitScale = Math.min(1, (availableWidth ?? width) / width);
  const scale = manualScale ?? fitScale;
  const minScale = Math.min(minManualScale, fitScale);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const viewportWidth = Math.floor(viewport.getBoundingClientRect().width);
      if (viewportWidth > 0) setAvailableWidth(viewportWidth);
    };
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(viewport, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const center = zoomCenterRef.current;
    zoomCenterRef.current = null;
    if (viewport && stage && center) scrollToGraphPoint(viewport, stage, scale, center);
  }, [scale]);

  function setZoom(nextScale?: number) {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (viewport && stage && (nextScale ?? fitScale) !== scale) {
      zoomCenterRef.current = {
        x: (viewport.scrollLeft + viewport.clientWidth / 2 - stage.offsetLeft) / scale,
        y: (viewport.scrollTop + viewport.clientHeight / 2 - stage.offsetTop) / scale,
      };
    }
    setManualScale(nextScale);
  }

  return (
    <>
      <div
        role="group"
        aria-label="杂交图谱操作"
        className="flex flex-wrap items-center justify-end gap-1"
      >
        <Button
          variant="ghost"
          size="icon-lg"
          type="button"
          title="放大图谱"
          aria-label="放大图谱"
          disabled={scale >= maxManualScale}
          onClick={() => setZoom(Math.min(maxManualScale, scale + zoomStep))}
        >
          <ZoomInIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          type="button"
          title="缩小图谱"
          aria-label="缩小图谱"
          disabled={scale <= minScale}
          onClick={() => setZoom(Math.max(minScale, scale - zoomStep))}
        >
          <ZoomOutIcon aria-hidden="true" />
        </Button>
        <Button
          variant={manualScale === undefined ? "secondary" : "ghost"}
          size="icon-lg"
          type="button"
          title="适应宽度"
          aria-label="适应宽度"
          aria-pressed={manualScale === undefined}
          onClick={() => setZoom(undefined)}
        >
          <MoveHorizontalIcon aria-hidden="true" />
        </Button>
      </div>
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${width} / ${height}`,
          minHeight: Math.min(height, minViewportHeight),
          maxHeight: height,
        }}
      >
        <div
          ref={viewportRef}
          role="region"
          aria-label={label}
          tabIndex={0}
          className="absolute inset-0 overflow-auto overscroll-x-contain rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <div className="grid min-h-full w-max min-w-full place-items-center">
            <div
              ref={stageRef}
              className="relative overflow-clip"
              style={{ width: width * scale, height: height * scale }}
            >
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{ width, height, transform: `scale(${scale})` }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
