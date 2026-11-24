import { ListPage } from "../list-page/page";
import { ListToolbar } from "../list-page/toolbar";
import { ListResultsSummary } from "../list-page/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListResults } from "../list-page/results";
import { recordTableSorting } from "../omnidex/sort";
import { useListLayout } from "../list-page/use-list-layout";
import type { OmnidexCatalog } from "../omnidex/catalog";
import { CatalogCard, catalogColumns, catalogListPresentation } from "./presentation";
import { ListEmpty } from "../list-page/states";
import { filterGroups, queryCatalog } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { CatalogSearch, CatalogQuery } from "./search";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";

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
  const layoutState = useListLayout(
    search.layout,
    (layout) => void onSearchChange((previous) => ({ ...previous, layout })),
  );
  const { layout } = layoutState;
  const { grid, toolbar } = catalogListPresentation;
  const { title } = toolbar;
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
        {...toolbar}
        query={query.q}
        onQueryChange={(q, replace) => update({ q }, replace)}
        sort={{ value: query.sort, options: sortOptions, onChange: (sort) => update({ sort }) }}
        {...layoutState}
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
      <ListResults
        layout={layout}
        resultKey={resultKey}
        rows={result.rows}
        columns={columns}
        getRowId={(row) => String(row.id)}
        label={`${title}表格`}
        sorting={recordTableSorting(query.sort, (sort) => update({ sort }))}
        grid={grid}
        virtual
        renderCard={(record) => <CatalogCard record={record} />}
        empty={<ListEmpty title={"物品"} onClear={data.rows.length ? clear : undefined} />}
      />
    </ListPage>
  );
}
