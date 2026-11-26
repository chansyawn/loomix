import { cn } from "cn";
import { ImageOffIcon } from "lucide-react";
import { useId, useState } from "react";
import { resourceUrl } from "@/infrastructure/resources";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead } from "@/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import type { HairDyeingRegion, HairDyeingSwatch } from "./hair-dyeing";
import type { HairDyeingState } from "./use-hair-dyeing";

export const hairDyeingSectionId = "hair-dyeing";

const swatchTypeNames = {
  tint: "纯色",
  texture: "贴图",
  materialReplacement: "材质替换",
};

const swatchPaths = {
  group:
    "M 5 53 C 5 35 18 20 31 12 C 42 5 50 8 61 9 C 73 10 83 10 90 7 C 94 5 95 9 95 15 C 96 26 97 37 96 49 C 96 65 87 80 75 89 C 64 97 51 99 39 94 C 21 88 5 71 5 53 Z",
  color:
    "M 13 12 C 23 10 32 6 44 6 C 55 6 63 10 66 17 C 69 22 74 19 80 20 C 90 22 96 30 96 40 C 96 49 90 53 89 57 C 87 62 91 66 90 73 C 89 83 80 90 68 94 C 56 98 43 96 36 89 C 32 85 32 80 29 78 C 25 75 19 77 13 72 C 3 65 3 51 8 40 C 13 31 22 26 18 21 C 15 17 10 14 13 12 Z",
};

export function HairDyeingPalette({ state }: { state: HairDyeingState }) {
  if (state.status === "loading")
    return (
      <div role="status" className="grid gap-3">
        <span className="text-sm text-muted-foreground">正在加载染发数据</span>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  if (state.status === "error")
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          染发数据暂时无法加载
        </p>
        <Button variant="outline" size="sm" onClick={state.retry}>
          重新加载
        </Button>
      </div>
    );
  return <HairDyeingRegions regions={state.regions} />;
}

function HairDyeingRegions({ regions }: { regions: HairDyeingRegion[] }) {
  const firstRegion = regions[0];
  if (!firstRegion) return null;

  return (
    <Tabs defaultValue={firstRegion.id} className="min-w-0">
      <TabsList
        aria-label="染色区域"
        className="max-w-full flex-wrap group-data-horizontal/tabs:h-auto"
      >
        {regions.map(({ id, name }) => (
          <TabsTrigger key={id} value={id}>
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
      {regions.map((region) => (
        <TabsContent key={region.id} value={region.id} className="min-w-0">
          <HairDyeingRegionTable region={region} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function HairDyeingRegionTable({ region }: { region: HairDyeingRegion }) {
  const columns = Math.max(...region.groups.map(({ swatches }) => swatches.length));
  return (
    <Table aria-label={`${region.name}的色系与颜色`}>
      <thead className="bg-muted/50">
        <tr className="border-b">
          <TableHead scope="col" className="min-w-28">
            <span className="pl-1">色系</span>
          </TableHead>
          <TableHead colSpan={columns}>颜色</TableHead>
        </tr>
      </thead>
      <TableBody>
        {region.groups.map((group) => (
          <tr key={group.id} className="border-b">
            <th scope="row" className="px-3 text-left font-medium whitespace-nowrap">
              <span className="inline-flex items-center gap-2 align-middle">
                <SwatchFace shape="group" color={group.color} image={group.image} />
                {group.name}
              </span>
            </th>
            {group.swatches.map((swatch, index) => (
              <TableCell key={swatch.id}>
                <SwatchFace
                  shape="color"
                  color={swatch.color}
                  image={swatch.kind === "tint" ? null : swatch.image}
                  material={swatch.kind !== "tint"}
                />
                <span className="sr-only">
                  {`${group.name}第 ${index + 1} 色，${swatchDescription(swatch)}`}
                </span>
              </TableCell>
            ))}
            {Array.from({ length: columns - group.swatches.length }, (_, index) => (
              <TableCell key={`empty-${index}`} />
            ))}
          </tr>
        ))}
      </TableBody>
    </Table>
  );
}

function swatchDescription(swatch: HairDyeingSwatch) {
  return swatch.kind === "tint" ? swatch.color : swatchTypeNames[swatch.kind];
}

function SwatchFace({
  shape,
  color,
  image,
  material = false,
}: {
  shape: "group" | "color";
  color: string;
  image: string | null;
  material?: boolean;
}) {
  const clipId = useId();
  const [failedImage, setFailedImage] = useState<string>();
  const preview = image && failedImage !== image ? image : null;
  const path = swatchPaths[shape];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className={cn(
        "inline-block flex-none align-middle",
        shape === "group" ? "size-7.5" : "size-9",
      )}
    >
      <path d={path} className="fill-background" />
      {!material && <path d={path} fill={color} />}
      {preview ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={path} />
            </clipPath>
          </defs>
          <image
            href={resourceUrl(preview)}
            width={100}
            height={100}
            clipPath={`url(#${clipId})`}
            onError={() => setFailedImage(preview)}
          />
        </>
      ) : material ? (
        <ImageOffIcon x={28} y={28} size={44} className="text-muted-foreground" />
      ) : null}
      <path
        d={path}
        className="fill-none stroke-[color-mix(in_oklab,var(--ring)_40%,var(--background))] stroke-3 [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
      />
    </svg>
  );
}
