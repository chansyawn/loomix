import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/dishes")({ component: DishesPage });

function DishesPage() {
  return <>菜肴</>;
}
