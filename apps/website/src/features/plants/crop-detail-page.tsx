import { CollectionDetailLayout } from "../collection/detail-layout";
import { CollectionItemCard } from "../collection/collection-item-card";
import { RecordImage } from "../collection/record-image";
import { ItemCookingUsage } from "../ingredients/item-usage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { matureCropStage, selectedCropTab, type CropDetail } from "./crop-detail";
import { PlantGrowthStages } from "./plant-growth";
import { plantSeriesFields } from "./series-fields";

export function CropDetailPage({
  detail,
  focus,
  onFocusChange,
}: {
  detail: CropDetail;
  focus?: number;
  onFocusChange: (focus?: number) => void;
}) {
  const tab = selectedCropTab(focus === undefined ? undefined : `item-${focus}`, detail.items);
  const { record } = detail;
  const seed = detail.seeds[0];
  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        record.description ? (
          <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
            {record.description}
          </p>
        ) : null
      }
      fields={plantSeriesFields(record)}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value !== "string" || selectedCropTab(value, detail.items) !== value) return;
          onFocusChange(value === "seed" ? detail.seeds[0]?.id : Number(value.slice(5)));
        }}
        className="min-w-0"
      >
        <div className="overflow-x-auto">
          <TabsList
            aria-label="种子与作物"
            variant="line"
            className="group-data-horizontal/tabs:h-auto"
          >
            <TabsTrigger value="seed" variant="ghost" className="h-auto shrink-0">
              <span aria-hidden="true" className="size-8 overflow-hidden rounded-lg">
                <RecordImage image={seed?.image ?? null} name="种子" compact />
              </span>
              种子
            </TabsTrigger>
            {detail.items.map((item) => (
              <TabsTrigger
                key={item.id}
                value={`item-${item.id}`}
                variant="ghost"
                className="h-auto shrink-0"
              >
                <span aria-hidden="true" className="size-8 overflow-hidden rounded-lg">
                  <RecordImage image={item.image} name={item.name} compact />
                </span>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="seed" className="mt-4">
          {tab === "seed" ? <PlantGrowthStages seeds={detail.seeds} /> : null}
        </TabsContent>
        {detail.items.map((item) => {
          const stage =
            item.summary.growths.flatMap(
              ({ growth }) => matureCropStage(growth, item.id) ?? [],
            )[0] ?? null;
          return (
            <TabsContent key={item.id} value={`item-${item.id}`} className="mt-4">
              {tab === `item-${item.id}` ? (
                <div className="space-y-8">
                  <section aria-labelledby={`crop-mature-${item.id}`} className="space-y-4">
                    <h2 id={`crop-mature-${item.id}`} className="text-lg font-semibold">
                      成熟形态
                    </h2>
                    <div className="w-fit max-w-full">
                      <CollectionItemCard
                        item={{ name: item.name, image: stage?.image ?? null }}
                        itemId={item.id}
                        description={item.description || "描述未提供"}
                        fullDescription
                      />
                    </div>
                  </section>
                  <ItemCookingUsage usage={detail.cookingByItemId.get(item.id) ?? null} />
                </div>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </CollectionDetailLayout>
  );
}
