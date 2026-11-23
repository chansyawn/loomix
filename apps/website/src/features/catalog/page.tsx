import { ListPage } from "../omnidex/page";
import { ListToolbar } from "../omnidex/toolbar";
import { ListResultsSummary } from "../omnidex/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListTable } from "../omnidex/table";
import { listSort, tableSorting } from "../omnidex/sort";
import { useListLayout, saveListLayout } from "../omnidex/use-list-layout";
import type { OmnidexCatalog } from "../omnidex/catalog";
import { CatalogCard, catalogColumns } from "./presentation";
import { VirtualGrid } from "../omnidex/virtual-grid";
import { compactGrid } from "../omnidex/grid-layout";
import { ListEmpty } from "../omnidex/states";
import { filterGroups, queryCatalog } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { CatalogSearch, CatalogQuery } from "./search";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
const title = "全部";
const grid = compactGrid(164);

type SearchUpdate = CatalogSearch | ((previous: CatalogSearch) => CatalogSearch);

export function CatalogPage({
  data,
  search,
  onSearchChange,
}: {
  data: OmnidexCatalog;
  search: CatalogSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const selectedTags = data.tags.acceptSelection(search.items.tags);
  const query =
    selectedTags.length === search.items.tags.length
      ? search.items
      : { ...search.items, tags: selectedTags };
  const layout = useListLayout(search.layout);
  const result = queryCatalog(data, query);
  const groups = filterGroups(data, query.tags);
  const resultKey = JSON.stringify([layout, query]);
  const update = (patch: Partial<CatalogQuery>, replace = false) =>
    void onSearchChange(
      (previous) => ({ ...previous, items: { ...previous.items, ...patch } }),
      replace,
    );
  const clear = () => void onSearchChange((previous) => ({ ...previous, items: emptyQuery() }));
  const chips = listFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = catalogColumns();
  return (
    <ListPage title={title}>
      <ListToolbar
        title={title}
        searchLabel="搜索物品名称"
        placeholder="搜索物品名称或拼音…"
        query={query.q}
        onQueryChange={(q, replace) => update({ q }, replace)}
        sort={query.sort}
        sortOptions={sortOptions}
        onSortChange={(sort) => update({ sort })}
        layout={layout}
        onLayoutChange={(next) => {
          saveListLayout(next);
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
            renderGroupControls={(group) =>
              group.key === "tags" ? (
                <ToggleGroup
                  aria-label="标签匹配方式"
                  variant="outline"
                  value={[query.tagMode]}
                  onValueChange={([mode]) => {
                    if (mode === "and" || mode === "or") update({ tagMode: mode });
                  }}
                >
                  <ToggleGroupItem value="and">满足全部（AND）</ToggleGroupItem>
                  <ToggleGroupItem value="or">满足任一（OR）</ToggleGroupItem>
                </ToggleGroup>
              ) : null
            }
          />
        }
      />
      <ListResultsSummary total={result.total} unit="条记录" chips={chips} onClear={clear} />
      {result.total > 0 ? (
        layout === "table" ? (
          <ListTable
            resultKey={resultKey}
            rows={result.rows}
            columns={columns}
            getRowId={(row) => String(row.id)}
            label={`${title}表格`}
            sorting={tableSorting(query.sort)}
            onSortingChange={(updater) => {
              const previous = tableSorting(query.sort);
              update({
                sort: listSort(typeof updater === "function" ? updater(previous) : updater),
              });
            }}
          />
        ) : (
          <VirtualGrid
            rows={result.rows}
            getKey={(record) => record.id}
            renderCard={(record) => <CatalogCard record={record} />}
            layout={grid}
          />
        )
      ) : (
        <ListEmpty title="物品" onClear={clear} />
      )}
    </ListPage>
  );
}
