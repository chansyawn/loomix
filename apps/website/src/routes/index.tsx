import { createFileRoute } from "@tanstack/react-router";

import { WikiLayout } from "@/features/layout/wiki-layout";
import { WikiPage } from "@/features/layout/wiki-page";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <WikiLayout>
      <WikiPage
        eyebrow="星布谷地 Wiki"
        title="探索星布谷地"
        description="浏览万象收藏中的家具、植物、生物、杂物、服饰和菜肴。"
      />
    </WikiLayout>
  );
}
