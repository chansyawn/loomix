import { Badge } from "@/ui/components/badge";
import type { NeighborDetail } from "./data";
import { Link } from "@tanstack/react-router";
import { allSearchForTag } from "../all/search";
import { recordLocation } from "../collection/item-route";
import { RecordImage } from "../collection/record-image";

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
                      <ul className="flex flex-wrap gap-x-3 gap-y-2 text-sm/5">
                        {group.items.map((item) => {
                          const content = (
                            <>
                              <span className="size-7 shrink-0 overflow-hidden rounded-md">
                                <RecordImage
                                  image={item.image}
                                  name={item.name}
                                  inset="none"
                                  background="none"
                                  fallback="icon"
                                />
                              </span>
                              <span className="min-w-0 wrap-anywhere">{item.name}</span>
                            </>
                          );
                          const className = "flex min-w-0 items-center gap-1.5";
                          return (
                            <li key={item.id} className="max-w-full min-w-0">
                              {item.recordId === null ? (
                                <span className={className}>{content}</span>
                              ) : (
                                <Link
                                  {...recordLocation({ id: item.recordId })}
                                  className={`${className} outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring`}
                                >
                                  {content}
                                </Link>
                              )}
                            </li>
                          );
                        })}
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
