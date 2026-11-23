import { ListPage } from "../omnidex/page";
import { ListToolbar } from "../omnidex/toolbar";
import { ListResultsSummary } from "../omnidex/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListTable } from "../omnidex/table";
import { listSort, tableSorting } from "../omnidex/sort";
import { useListLayout, saveListLayout } from "../omnidex/use-list-layout";
import type { MiscellaneousData } from "./data";
import { MiscellaneousCard } from "./miscellaneous-card";
import { filterGroups, queryMiscellaneous } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { MiscellaneousSearch, MiscellaneousQuery } from "./search";
import { MiscellaneousEmpty } from "./states";
import { miscellaneousTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";

type SearchUpdate = MiscellaneousSearch | ((previous: MiscellaneousSearch) => MiscellaneousSearch);

export function MiscellaneousPage({
  data,
  search,
  onSearchChange,
}: {
  data: MiscellaneousData;
  search: MiscellaneousSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search.items;
  const layout = useListLayout(search.layout);
  const presentation = listPresentation();
  const result = queryMiscellaneous(data, query);
  const groups = filterGroups(data);
  const resultKey = JSON.stringify([layout, query]);
  const update = (patch: Partial<MiscellaneousQuery>, replace = false) =>
    void onSearchChange(
      (previous) => ({ ...previous, items: { ...previous.items, ...patch } }),
      replace,
    );
  const clear = () => void onSearchChange((previous) => ({ ...previous, items: emptyQuery() }));
  const chips = listFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = miscellaneousTableColumns();
  return (
    <ListPage title={title}>
      <ListToolbar
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
          />
        }
      />
      <ListResultsSummary
        total={result.total}
        unit={presentation.unit}
        chips={chips}
        onClear={clear}
      />
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
          <div className={`${presentation.grid.className} pb-8`}>
            {result.rows.map((row) => (
              <MiscellaneousCard key={row.id} item={row} />
            ))}
          </div>
        )
      ) : (
        <MiscellaneousEmpty onClear={clear} />
      )}
    </ListPage>
  );
}
