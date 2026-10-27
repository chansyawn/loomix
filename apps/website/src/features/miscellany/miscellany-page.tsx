import { CollectionPage } from "../collection/page";
import { CollectionToolbar } from "../collection/toolbar";
import { CollectionResultsSummary } from "../collection/results-summary";
import { collectionFilterChips } from "../collection/filter-chips";
import { FilterPanel } from "../collection/filter-panel";
import { CollectionTable } from "../collection/table";
import { collectionSort, tableSorting } from "../collection/sort";
import { useCollectionLayout, saveCollectionLayout } from "../collection/use-collection-layout";
import type { MiscellanyData } from "./data";
import { MiscellanyCard } from "./miscellany-card";
import { filterGroups, queryMiscellany } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { MiscellanySearch, MiscellanyQuery } from "./search";
import { MiscellanyEmpty } from "./states";
import { miscellanyTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";

type SearchUpdate = MiscellanySearch | ((previous: MiscellanySearch) => MiscellanySearch);

export function MiscellanyPage({
  data,
  search,
  onSearchChange,
}: {
  data: MiscellanyData;
  search: MiscellanySearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search.items;
  const layout = useCollectionLayout(search.layout);
  const presentation = listPresentation();
  const result = queryMiscellany(data, query);
  const groups = filterGroups(data);
  const resultKey = JSON.stringify([layout, query]);
  const update = (patch: Partial<MiscellanyQuery>, replace = false) =>
    void onSearchChange(
      (previous) => ({ ...previous, items: { ...previous.items, ...patch } }),
      replace,
    );
  const clear = () => void onSearchChange((previous) => ({ ...previous, items: emptyQuery() }));
  const chips = collectionFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = miscellanyTableColumns();
  return (
    <CollectionPage title={title}>
      <CollectionToolbar
        title={title}
        searchLabel={presentation.searchLabel}
        placeholder={presentation.placeholder}
        query={query.q}
        onQueryChange={(q, replace) => update({ q }, replace)}
        sort={query.sort}
        sortOptions={sortOptions}
        onSortChange={(sort) => update({ sort })}
        layout={layout}
        onLayoutChange={(next) => {
          saveCollectionLayout(next);
          void onSearchChange((previous) => ({ ...previous, layout: next }));
        }}
        filters={
          <FilterPanel
            title={`筛选${title}`}
            groups={groups}
            query={query}
            total={result.total}
            onFilter={(key, values) => update({ [key]: values })}
            onClear={clear}
          />
        }
      />
      <CollectionResultsSummary
        total={result.total}
        unit={presentation.unit}
        chips={chips}
        onClear={clear}
      />
      {result.total > 0 ? (
        layout === "table" ? (
          <CollectionTable
            resultKey={resultKey}
            rows={result.rows}
            columns={columns}
            getRowId={(row) => String(row.id)}
            label={`${title}表格`}
            sorting={tableSorting(query.sort)}
            onSortingChange={(updater) => {
              const previous = tableSorting(query.sort);
              update({
                sort: collectionSort(typeof updater === "function" ? updater(previous) : updater),
              });
            }}
          />
        ) : (
          <div className={`${presentation.grid.className} pb-8`}>
            {result.rows.map((row) => (
              <MiscellanyCard key={row.id} item={row} />
            ))}
          </div>
        )
      ) : (
        <MiscellanyEmpty onClear={clear} />
      )}
    </CollectionPage>
  );
}
