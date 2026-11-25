import { catalogItem } from "@/features/layout/navigation";
import { Badge } from "@/ui/components/badge";
import type { NeighborDetail } from "./data";
import { Link } from "@tanstack/react-router";
import { catalogSearchForTag } from "../catalog/search";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { GameplayRelationItem } from "../omnidex/gameplay-relation-item";

export function NeighborPreferences({
  preferences,
}: {
  preferences: NeighborDetail["preferences"];
}) {
  return (
    <div className="grid gap-4 @min-[30rem]/detail-content:grid-cols-2 @min-[42rem]/detail-content:grid-cols-3">
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
                    <ul className="flex flex-wrap gap-x-3 gap-y-2">
                      {group.items.map((item) => (
                        <li key={item.id} className="flex max-w-full min-w-0">
                          <GameplayRelationItem
                            name={item.name}
                            image={item.image}
                            variant="inline"
                            destination={
                              item.recordId === null
                                ? undefined
                                : catalogEntryLocation({ id: item.recordId })
                            }
                          />
                        </li>
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
                        render={<Link to={catalogItem.to} search={catalogSearchForTag(tag.id)} />}
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
  );
}
