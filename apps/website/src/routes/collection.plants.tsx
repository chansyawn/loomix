import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/plants")({ component: PlantsPage });

function PlantsPage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="植物" description="浏览星布谷地中的植物收藏。" />
    </WikiLayout>
  );
}
