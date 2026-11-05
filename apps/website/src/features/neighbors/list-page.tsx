import type { NeighborsData } from "./data";
import { NeighborsGrid, NeighborsListLayout } from "./list-layout";
import { NeighborCard } from "./neighbor-card";
import { queryNeighbors, type NeighborsSearch } from "./search";
import { NeighborsEmpty } from "./states";

type SearchUpdate = NeighborsSearch | ((previous: NeighborsSearch) => NeighborsSearch);
export function NeighborsPage({
  data,
  search,
  onSearchChange,
}: {
  data: NeighborsData;
  search: NeighborsSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const results = queryNeighbors(data, search);
  const update = (patch: Partial<NeighborsSearch>, replace = false) =>
    void onSearchChange((previous) => ({ ...previous, ...patch }), replace);
  const clear = () => void onSearchChange({ q: "", galaxy: "" });
  return (
    <NeighborsListLayout
      search={search}
      total={results.length}
      onQueryChange={(q, replace) => update({ q }, replace)}
      onGalaxyChange={(galaxy) => update({ galaxy })}
      onClear={clear}
    >
      {results.length ? (
        <NeighborsGrid>
          {results.map((neighbor) => (
            <NeighborCard key={neighbor.id} neighbor={neighbor} />
          ))}
        </NeighborsGrid>
      ) : (
        <NeighborsEmpty onClear={clear} />
      )}
    </NeighborsListLayout>
  );
}
