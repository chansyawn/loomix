import { cn } from "cn";
import { ImageOffIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { resourceUrl } from "@/infrastructure/resources";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import type { HairDyeingRegion, HairDyeingSwatch } from "./hair-dyeing";
import styles from "./hair-dyeing-palette.module.css";
import type { HairDyeingState } from "./use-hair-dyeing";

export const hairDyeingSectionId = "hair-dyeing";

const swatchTypeNames = {
  tint: "纯色",
  texture: "贴图",
  materialReplacement: "材质替换",
};

export function HairDyeingPalette({ state }: { state: HairDyeingState }) {
  if (state.status === "loading")
    return (
      <div role="status" className="grid gap-3 rounded-xl border p-4">
        <span className="text-sm text-muted-foreground">正在加载调色盘</span>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  if (state.status === "error")
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <p role="status" className="text-sm text-muted-foreground">
          染色调色盘暂时无法加载
        </p>
        <Button variant="outline" size="sm" onClick={state.retry}>
          重新加载
        </Button>
      </div>
    );
  return <HairDyeingRegions regions={state.regions} />;
}

function HairDyeingRegions({ regions }: { regions: HairDyeingRegion[] }) {
  const [activeId, setActiveId] = useState(regions[0]?.id);
  const [selected, setSelected] = useState<SelectedSwatch>();
  const active = regions.find(({ id }) => id === activeId) ?? regions[0];
  if (!active) return null;
  const regionTable = (
    <HairDyeingRegionTable region={active} selected={selected} onSelect={setSelected} />
  );
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-background">
      {regions.length === 1 ? (
        <>
          <p className="border-b px-3 py-2 text-sm font-medium">{active.name}</p>
          {regionTable}
        </>
      ) : (
        <Tabs
          value={active.id}
          onValueChange={(id: number) => {
            setActiveId(id);
            setSelected(undefined);
          }}
        >
          <div className="px-3 pt-2">
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
          </div>
          {regions.map(({ id }) => (
            <TabsContent key={id} value={id} className="min-w-0">
              {id === active.id ? regionTable : null}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

type SelectedSwatch = { groupId: number; swatchId: number };

function HairDyeingRegionTable({
  region,
  selected,
  onSelect,
}: {
  region: HairDyeingRegion;
  selected: SelectedSwatch | undefined;
  onSelect: (selected: SelectedSwatch | undefined) => void;
}) {
  const columns = Math.max(...region.groups.map(({ swatches }) => swatches.length));
  const activeGroup = region.groups.find(({ id }) => id === selected?.groupId);
  const activeSwatch = activeGroup?.swatches.find(({ id }) => id === selected?.swatchId);
  return (
    <>
      <Table aria-label={`${region.name}的色系与颜色`}>
        <thead className="bg-muted/50">
          <TableRow>
            <TableHead scope="col" className="min-w-28">
              <span className="pl-1">色系</span>
            </TableHead>
            <TableHead colSpan={columns}>颜色</TableHead>
          </TableRow>
        </thead>
        <TableBody>
          {region.groups.map((group) => (
            <TableRow key={group.id}>
              <th scope="row" className="px-3 text-left font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2 align-middle">
                  <SwatchFace shape="group" color={group.color} image={group.image} />
                  {group.name}
                </span>
              </th>
              {group.swatches.map((swatch, index) => {
                const pressed = group.id === activeGroup?.id && swatch.id === activeSwatch?.id;
                const label = `${group.name}第 ${index + 1} 色，${swatchDescription(swatch)}`;
                return (
                  <TableCell key={swatch.id}>
                    <Button
                      variant={pressed ? "outline" : "ghost"}
                      size="icon-lg"
                      className="size-11"
                      aria-pressed={pressed}
                      aria-label={label}
                      title={label}
                      onClick={() =>
                        onSelect(pressed ? undefined : { groupId: group.id, swatchId: swatch.id })
                      }
                    >
                      <SwatchFace
                        shape="color"
                        color={swatch.color}
                        image={swatch.kind === "tint" ? null : swatch.image}
                        material={swatch.kind !== "tint"}
                      />
                    </Button>
                  </TableCell>
                );
              })}
              {Array.from({ length: columns - group.swatches.length }, (_, index) => (
                <TableCell key={`empty-${index}`} />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div role="status" className="min-h-10 border-t px-3 py-2 text-sm text-muted-foreground">
        {activeGroup && activeSwatch ? (
          <>
            <span className="font-medium text-foreground">{activeGroup.name}</span>
            {" · "}
            {swatchDescription(activeSwatch)}
          </>
        ) : (
          "选择色卡查看颜色"
        )}
      </div>
    </>
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
  const [failedImage, setFailedImage] = useState<string>();
  const preview = image && failedImage !== image ? image : null;
  return (
    <span
      aria-hidden="true"
      className={cn(styles.outline, shape === "group" ? styles.group : styles.color)}
    >
      <span
        className={styles.fill}
        style={{ "--swatch-color": material ? "transparent" : color } as CSSProperties}
      >
        {preview ? (
          <img
            src={resourceUrl(preview)}
            alt=""
            loading="lazy"
            className="size-full object-contain"
            onError={() => setFailedImage(preview)}
          />
        ) : material ? (
          <ImageOffIcon className="size-4 text-muted-foreground" />
        ) : null}
      </span>
    </span>
  );
}
