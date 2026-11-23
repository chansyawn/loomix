import { Link } from "@tanstack/react-router";
import { Card } from "@/ui/components/card";
import { catalogItem, omnidexNavigation, neighborsItem, starseaItem } from "../layout/navigation";

const categories = [
  ...omnidexNavigation.items.filter((item) => item.to !== catalogItem.to),
  neighborsItem,
  starseaItem,
];

export function OmnidexShortcuts() {
  return (
    <section aria-labelledby="home-categories">
      <h2 id="home-categories" className="mb-4 font-heading text-lg font-semibold">
        探索图鉴
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {categories.map(({ title, to, icon: Icon }) => (
          <Card key={to} padding="none" interactive>
            <Link
              to={to}
              search={{}}
              preload={false}
              className="flex flex-col items-center gap-3 px-3 py-5 outline-none"
            >
              <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">{title}</span>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
