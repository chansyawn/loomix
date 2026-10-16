import { createFileRoute, useRouter } from "@tanstack/react-router";

import { loadFurniture } from "@/features/furniture/data";
import { FurniturePage } from "@/features/furniture/furniture-page";
import { parseFurnitureSearch } from "@/features/furniture/query";
import { FurnitureLoading } from "@/features/furniture/states";
import { Button } from "@/ui/components/button";

export const Route = createFileRoute("/collection/furniture")({
  ssr: false,
  validateSearch: parseFurnitureSearch,
  loader: () => loadFurniture(),
  pendingComponent: FurnitureLoading,
  errorComponent: FurnitureError,
  component: FurnitureRoute,
});

function FurnitureRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <FurniturePage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) => {
        void navigate({ search: update, replace, resetScroll: false });
      }}
    />
  );
}

function FurnitureError() {
  const router = useRouter();
  return (
    <section className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold">家具图鉴暂时无法加载</h1>
      <p className="text-sm text-muted-foreground">请检查网络连接，然后再试一次。</p>
      <Button onClick={() => void router.invalidate()}>重新加载</Button>
    </section>
  );
}
