import { Link } from "@tanstack/react-router";
import { CollectionDetailLayout } from "@/features/collection/detail-layout";
import { recordLocation } from "@/features/collection/item-route";
import { RecordImage } from "@/features/collection/record-image";
import type { StarseaDetail } from "./view";

const detailLink =
  "rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-ring";

function IsletItems({ title, items }: { title: string; items: StarseaDetail["creatures"] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {items?.length ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              {item.browsable ? (
                <Link {...recordLocation(item)} className={detailLink}>
                  {item.name}
                </Link>
              ) : (
                item.name
              )}
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
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {neighbors.map((neighbor) => (
              <li key={neighbor.id}>
                <Link
                  to="/neighbors/$id"
                  params={{ id: String(neighbor.id) }}
                  className={detailLink}
                >
                  {neighbor.name}
                </Link>
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
    <CollectionDetailLayout
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
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          生物与特产为探索提示，实际产出受探索条件影响。
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <IsletItems title="生物" items={islet.creatures} />
          <IsletItems title="特产" items={islet.specialties} />
        </div>
      </div>
      <EncounterSection neighbors={islet.encounterNeighbors} />
    </CollectionDetailLayout>
  );
}
