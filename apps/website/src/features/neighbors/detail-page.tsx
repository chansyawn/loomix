import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { NeighborsReturnLink, useNeighborsOrigin } from "./navigation";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { NeighborStories, NeighborTravel } from "./reading";

const sections = [
  ["overview", "概览"],
  ["themes", "创想卡集"],
  ["stories", "友邻故事"],
  ["travel", "旅行台词"],
] as const;
export function NeighborDetailPage({ neighbor }: { neighbor: NeighborDetail }) {
  const origin = useNeighborsOrigin();
  return (
    <div className="space-y-6 pb-12">
      <NeighborsReturnLink className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeftIcon className="size-4" />
        返回友邻列表
      </NeighborsReturnLink>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          aria-label="友邻详情目录"
          className="flex flex-wrap gap-2 lg:sticky lg:top-4 lg:order-last lg:w-36 lg:shrink-0 lg:flex-col"
        >
          {sections.map(([id, label]) => (
            <Link
              key={id}
              to="/neighbors/$id"
              params={{ id: String(neighbor.id) }}
              hash={id}
              state={{ neighborsOrigin: origin }}
              replace
              resetScroll={false}
              className="rounded-full border px-4 py-2 text-sm outline-none hover:bg-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1 space-y-12">
          <section
            id="overview"
            aria-labelledby="neighbor-heading"
            className="scroll-mt-4 overflow-hidden rounded-3xl border"
          >
            <NeighborImage
              image={neighbor.image}
              name={`${neighbor.name}的星湾插画`}
              eager
              className="aspect-[156/41] rounded-none"
            />
            <div className="space-y-4 p-5 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <h1 id="neighbor-heading" className="text-3xl font-semibold tracking-tight">
                  {neighbor.name}
                </h1>
                <Badge variant="secondary">
                  {neighbor.bodyType ? `${neighbor.bodyType}体型` : "体型资料暂未收录"}
                </Badge>
              </div>
              {neighbor.stars.map((star) => (
                <p key={star.key} className="text-muted-foreground">
                  {star.name} · {star.galaxy ? `${star.galaxy}星系` : "星系资料暂未收录"}
                </p>
              ))}
            </div>
          </section>
          <section id="themes" aria-labelledby="themes-heading" className="scroll-mt-4 space-y-4">
            <h2 id="themes-heading" className="text-2xl font-semibold">
              创想卡集
            </h2>
            {neighbor.themes.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {neighbor.themes.map((theme) => (
                  <article key={theme.key} className="overflow-hidden rounded-2xl border p-3">
                    <NeighborImage image={theme.image} name={theme.name} className="aspect-2/1" />
                    <div className="space-y-3 p-2 pt-4">
                      <h3 className="font-semibold">{theme.name}</h3>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {theme.description ?? "当前资料暂未收录获取说明"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border p-6 text-muted-foreground">
                当前资料暂未收录关联卡集
              </p>
            )}
          </section>
          <NeighborStories neighbor={neighbor} />
          <NeighborTravel neighbor={neighbor} />
        </div>
      </div>
    </div>
  );
}
