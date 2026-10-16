import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/plants")({ component: PlantsPage });

function PlantsPage() {
  return <>植物</>;
}
