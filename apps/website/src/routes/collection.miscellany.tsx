import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/collection/miscellany")({ component: MiscellanyPage });

function MiscellanyPage() {
  return <>杂物</>;
}
