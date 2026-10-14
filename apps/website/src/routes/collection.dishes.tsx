import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/dishes")({ component: DishesPage });

function DishesPage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="菜肴" description="浏览星布谷地中的菜肴收藏。" />
    </WikiLayout>
  );
}
