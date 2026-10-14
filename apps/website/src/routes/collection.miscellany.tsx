import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/miscellany")({ component: MiscellanyPage });

function MiscellanyPage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="杂物" description="浏览星布谷地中的杂物收藏。" />
    </WikiLayout>
  );
}
