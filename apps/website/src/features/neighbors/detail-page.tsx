import { Fragment } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { NeighborsReturnLink } from "./navigation";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { NeighborPreferences } from "./preferences";
import { NeighborStories, NeighborTravel } from "./reading";

const fieldClassName = "min-w-0 space-y-1.5 rounded-xl bg-muted/40 p-3 sm:p-4";

export function NeighborDetailPage({ neighbor }: { neighbor: NeighborDetail }) {
  return (
    <div className="space-y-6 pb-8">
      <NeighborsReturnLink className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        返回友邻列表
      </NeighborsReturnLink>
      <section
        id="overview"
        aria-labelledby="neighbor-heading"
        className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-12"
      >
        <div className="mx-auto w-full max-w-104 overflow-hidden rounded-4xl border bg-muted/30 lg:sticky lg:top-6 lg:mx-0">
          <NeighborImage
            image={neighbor.favourImage}
            name={`${neighbor.name}的好感插画`}
            eager
            className="aspect-square rounded-none bg-transparent p-4 sm:p-6"
          />
        </div>
        <div className="min-w-0 space-y-4">
          <h1
            id="neighbor-heading"
            className="text-3xl/tight font-semibold tracking-tight wrap-break-word sm:text-4xl"
          >
            {neighbor.name}
          </h1>
          <dl className="grid grid-cols-1 gap-3 text-sm/6 sm:grid-cols-2 sm:gap-4">
            <div className={`${fieldClassName} sm:col-span-2`}>
              <dt className="text-xs text-muted-foreground">体型</dt>
              <dd>{neighbor.bodyType ? `${neighbor.bodyType}体型` : "体型资料暂未收录"}</dd>
            </div>
            {neighbor.stars.length ? (
              neighbor.stars.map((star) => (
                <Fragment key={star.key}>
                  <div className={fieldClassName}>
                    <dt className="text-xs text-muted-foreground">所属星球</dt>
                    <dd className="wrap-break-word">{star.name}</dd>
                  </div>
                  <div className={fieldClassName}>
                    <dt className="text-xs text-muted-foreground">所属星系</dt>
                    <dd className="wrap-break-word">
                      {star.galaxy ? `${star.galaxy}星系` : "星系资料暂未收录"}
                    </dd>
                  </div>
                </Fragment>
              ))
            ) : (
              <div className={`${fieldClassName} sm:col-span-2`}>
                <dt className="text-xs text-muted-foreground">所属星球与星系</dt>
                <dd>星球与星系资料暂未收录</dd>
              </div>
            )}
          </dl>
        </div>
      </section>
      <div className="mt-10 space-y-10 border-t-3 border-dotted pt-8">
        <NeighborPreferences preferences={neighbor.preferences} />
        <NeighborStories neighbor={neighbor} />
        <NeighborTravel neighbor={neighbor} />
      </div>
    </div>
  );
}
