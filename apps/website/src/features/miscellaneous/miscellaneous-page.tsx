import { ListPage } from "../list-page/page";
import { ListToolbar } from "../list-page/toolbar";
import { ListResultsSummary } from "../list-page/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListResults } from "../list-page/results";
import { recordTableSorting } from "../omnidex/sort";
import { useListLayout } from "../list-page/use-list-layout";
import type { MiscellaneousData } from "./data";
import { MiscellaneousCard } from "./miscellaneous-card";
import { filterGroups, queryMiscellaneous } from "./query";
import { emptyQuery, sortOptions } from "./search";
import type { MiscellaneousSearch, MiscellaneousQuery } from "./search";
import { ListEmpty } from "../list-page/states";
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
  const layoutState = useListLayout(
    search.layout,
    (layout) => void onSearchChange((previous) => ({ ...previous, layout })),
  );
  const { layout } = layoutState;
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
          />
        }
      />
      <ListResultsSummary
        total={result.total}
        unit={presentation.unit}
        chips={chips}
        onClear={clear}
      />
      <ListResults
        layout={layout}
        resultKey={resultKey}
        rows={result.rows}
        columns={columns}
        getRowId={(row) => String(row.id)}
        label={`${title}表格`}
        sorting={recordTableSorting(query.sort, (sort) => update({ sort }))}
        grid={presentation.grid}
        renderCard={(row) => <MiscellaneousCard item={row} />}
        empty={<ListEmpty title={title} onClear={data.length ? clear : undefined} />}
      />
    </ListPage>
  );
}
