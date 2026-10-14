import { createFileRoute } from "@tanstack/react-router";
import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/collection/clothing")({ component: ClothingPage });

function ClothingPage() {
  return (
    <WikiLayout>
      <WikiPage eyebrow="万象收藏" title="服饰" description="浏览星布谷地中的服饰收藏。" />
    </WikiLayout>
  );
}
