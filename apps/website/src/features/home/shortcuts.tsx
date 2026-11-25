import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/ui/components/card";
import {
  catalogItem,
  omnidexNavigation,
  neighborsItem,
  starseaItem,
  vignettesItem,
} from "../layout/navigation";

const categories = [
  ...omnidexNavigation.items.filter((item) => item.to !== catalogItem.to),
  neighborsItem,
  starseaItem,
  vignettesItem,
];

export function OmnidexShortcuts() {
  return (
    <section aria-labelledby="home-categories">
      <h2 id="home-categories" className="mb-4 font-heading text-lg font-semibold">
        探索图鉴
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-9">
        {categories.map(({ title, to, icon: Icon }) => (
          <Card key={to} size="sm" className="relative">
            <CardContent>
              <Link
                to={to}
                search={{}}
                preload={false}
                className="flex flex-col items-center gap-2 text-center outline-none after:absolute after:inset-0 after:rounded-xl hover:underline focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
              >
                <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{title}</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
