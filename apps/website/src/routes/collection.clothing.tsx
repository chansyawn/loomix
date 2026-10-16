import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/clothing")({ component: ClothingPage });

function ClothingPage() {
  return <>服饰</>;
}
