import { Badge } from "@/ui/components/badge";
import type { NeighborDetail } from "./data";
import { Link } from "@tanstack/react-router";
import { allSearchForTag } from "../all/search";

export function NeighborPreferences({
  preferences,
}: {
  preferences: NeighborDetail["preferences"];
}) {
  return (
    <section id="preferences" aria-labelledby="preferences-heading" className="space-y-4">
      <h2 id="preferences-heading" className="text-lg font-semibold">
        喜好信息
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {preferences.map((group) => (
          <section
            key={group.level}
            aria-labelledby={`preference-${group.level}`}
            className="min-w-0 space-y-4 rounded-2xl border p-4 sm:p-5"
          >
            <h3 id={`preference-${group.level}`} className="font-semibold">
              {group.name}
            </h3>
            {group.items.length || group.tags.length ? (
              <dl className="space-y-4">
                {group.items.length > 0 && (
                  <div className="space-y-2">
                    <dt className="text-xs text-muted-foreground">具体物品</dt>
                    <dd>
                      <ul className="space-y-1 text-sm/6 wrap-break-word">
                        {group.items.map((item) => (
                          <li key={item.id}>{item.name}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {group.tags.length > 0 && (
                  <div className="space-y-2">
                    <dt className="text-xs text-muted-foreground">偏好标签</dt>
                    <dd className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="max-w-full wrap-anywhere whitespace-normal"
                          render={<Link to="/collections/all" search={allSearchForTag(tag.id)} />}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">当前资料暂未收录</p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
