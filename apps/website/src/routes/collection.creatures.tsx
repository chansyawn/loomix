import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/creatures")({ component: CreaturesPage });

function CreaturesPage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="生物" description="浏览星布谷地中的生物收藏。" />
    </WikiLayout>
  );
}
