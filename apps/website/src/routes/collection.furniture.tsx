import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/furniture")({ component: FurniturePage });

function FurniturePage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="家具" description="浏览星布谷地中的家具收藏。" />
    </WikiLayout>
  );
}
