import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/furniture")({ component: FurniturePage });

function FurniturePage() {
  return <>家具</>;
}
