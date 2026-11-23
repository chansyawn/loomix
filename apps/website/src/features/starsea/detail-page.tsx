import { DetailLayout } from "@/features/omnidex/detail-layout";
import { CatalogItemCard } from "@/features/omnidex/catalog-item-card";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { RecordImage } from "@/features/omnidex/record-image";
import type { StarseaDetail } from "./view";

const relatedCardGrid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3";

function IsletItems({ title, items }: { title: string; items: StarseaDetail["creatures"] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {items?.length ? (
        <ul className={relatedCardGrid}>
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <CatalogItemCard
                item={item}
                itemId={item.id}
                link={item.browsable ? catalogEntryLocation(item) : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {items === null ? "未配置探索提示" : "没有展示条目"}
        </p>
      )}
    </section>
  );
}

function EncounterSection({ neighbors }: { neighbors: StarseaDetail["encounterNeighbors"] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">邂逅友邻</h2>
      {neighbors.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">实际出场受探索和季遇状态影响。</p>
          <ul className={relatedCardGrid}>
            {neighbors.map((neighbor) => (
              <li key={neighbor.id} className="min-w-0">
                <CatalogItemCard
                  item={neighbor}
                  itemId={neighbor.id}
                  link={{ to: "/neighbors/$id", params: { id: String(neighbor.id) } }}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">暂无已确认的邂逅友邻</p>
      )}
    </section>
  );
}

export function StarseaDetailPage({ islet }: { islet: StarseaDetail }) {
  const galaxies = [...new Set(islet.regions.map(({ galaxyName }) => galaxyName))];
  const unlockTips = [...new Set(islet.regions.flatMap(({ unlockTip }) => unlockTip ?? []))];
  return (
    <DetailLayout
      image={
        <RecordImage
          key={islet.image}
          image={islet.image}
          name={islet.name}
          fit={islet.illustrated ? "cover" : "contain"}
          inset={islet.illustrated ? "none" : "lg"}
          eager
          className={islet.illustrated ? "aspect-video" : "aspect-2/1"}
        />
      }
      title={islet.name}
      fields={[
        ["所属星海", islet.regions.map(({ name }) => name).join("、")],
        ["所属星系", galaxies.join("、")],
        ...(islet.encounterOnly ? [["探索方式", "邂逅候选"] as const] : []),
        ...(unlockTips.length ? [["区域解锁提示", unlockTips.join("\n")] as const] : []),
      ]}
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          生物与特产为探索提示，实际产出受探索条件影响。
        </p>
        <IsletItems title="生物" items={islet.creatures} />
        <IsletItems title="特产" items={islet.specialties} />
      </div>
      <EncounterSection neighbors={islet.encounterNeighbors} />
    </DetailLayout>
  );
}
