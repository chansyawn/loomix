import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/creatures")({ component: CreaturesPage });

function CreaturesPage() {
  return <>生物</>;
}
