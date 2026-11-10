import { CollectionPage } from "../collection/page";
import { CollectionToolbar } from "../collection/toolbar";
import { CollectionResultsSummary } from "../collection/results-summary";
import { collectionFilterChips } from "../collection/filter-chips";
import { FilterPanel } from "../collection/filter-panel";
import { CollectionTable } from "../collection/table";
import { collectionSort, tableSorting } from "../collection/sort";
import { useCollectionLayout, saveCollectionLayout } from "../collection/use-collection-layout";
import type { CollectionCatalog } from "../collection/catalog";
import { AllCard, allColumns } from "./presentation";
import { CollectionVirtualGrid } from "../collection/virtual-grid";
import { compactGrid } from "../collection/grid-layout";
import { CollectionEmpty } from "../collection/states";
import { filterGroups, queryAll, normalizeAllQuery } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { AllSearch, AllQuery } from "./search";
const title = "全部";
const grid = compactGrid(164);

type SearchUpdate = AllSearch | ((previous: AllSearch) => AllSearch);

export function AllPage({
  data,
  search,
  onSearchChange,
}: {
  data: CollectionCatalog;
  search: AllSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = normalizeAllQuery(data, search.items);
  const layout = useCollectionLayout(search.layout);
  const result = queryAll(data, query);
  const groups = filterGroups(data);
  const resultKey = JSON.stringify([layout, query]);
  const update = (patch: Partial<AllQuery>, replace = false) =>
    void onSearchChange(
      (previous) => ({ ...previous, items: { ...previous.items, ...patch } }),
      replace,
    );
  const clear = () => void onSearchChange((previous) => ({ ...previous, items: emptyQuery() }));
  const chips = collectionFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = allColumns();
  return (
    <CollectionPage title={title}>
      <CollectionToolbar
        title={title}
        searchLabel="搜索全部物品"
        placeholder="搜索编号、名称、介绍或标签"
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
      <CollectionResultsSummary total={result.total} unit="条记录" chips={chips} onClear={clear} />
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
          <CollectionVirtualGrid
            rows={result.rows}
            getKey={(record) => record.id}
            renderCard={(record) => <AllCard record={record} />}
            layout={grid}
          />
        )
      ) : (
        <CollectionEmpty title="物品" onClear={clear} />
      )}
    </CollectionPage>
  );
}
