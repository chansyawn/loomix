import { getRouteApi } from "@tanstack/react-router";
import { CollectionDetailLayout } from "../collection/detail-layout";
import { CollectionItemCard } from "../collection/collection-item-card";
import { RecordImage } from "../collection/record-image";
import { ItemCookingUsage } from "../ingredients/item-usage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { matureCropStage, selectedCropTab, type CropDetail } from "./crop-detail";
import { CropGrowth } from "./crop-growth";
import { plantSeriesFields } from "./series-fields";

const route = getRouteApi("/collection/plants_/series/$id");

export function CropDetailPage({ detail }: { detail: CropDetail }) {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const tab = selectedCropTab(search.tab, detail.items);
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
          void navigate({
            search: (previous) => ({ ...previous, tab: value === "seed" ? undefined : value }),
            state: (previous) => previous,
            resetScroll: false,
          });
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
          {tab === "seed" ? <CropGrowth detail={detail} state={(previous) => previous} /> : null}
        </TabsContent>
        {detail.items.map((item) => {
          const stage = matureCropStage(item.growth, item.id);
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
