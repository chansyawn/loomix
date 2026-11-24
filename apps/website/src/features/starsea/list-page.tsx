import { ListPage } from "@/features/list-page/page";
import { ListToolbar } from "@/features/list-page/toolbar";
import { choiceFilterChips, ListChoiceFilter } from "@/features/list-page/choice-filter";
import { ListResultsSummary } from "@/features/list-page/results-summary";
import { ListResults } from "@/features/list-page/results";
import { ListEmpty } from "@/features/list-page/states";
import { useListLayout } from "@/features/list-page/use-list-layout";
import { filterIslets } from "./query";
import { starseaSearchDefaults, type StarseaSearch } from "./search";
import type { StarseaList } from "./view";
import { isletColumns, IsletCard, starseaListPresentation } from "./list-presentation";

export function StarseaListPage({
  data,
  search,
  historyIndex,
  onChange,
}: {
  data: StarseaList;
  search: StarseaSearch;
  historyIndex: number;
  onChange: (patch: Partial<StarseaSearch>, replace?: boolean) => void;
}) {
  const visible = filterIslets(data.islets, search);
  const origin = { search, index: historyIndex };
  const { toolbar, choice, grid } = starseaListPresentation;
  const layoutState = useListLayout(search.layout, (layout) => onChange({ layout }));
  const options = data.regions.map((region) => ({ value: String(region.id), label: region.name }));
  const activeValue = search.region === null ? "" : String(search.region);
  const clear = () => onChange(starseaSearchDefaults);
  const chips = choiceFilterChips(
    { value: search.q, clear: () => onChange({ q: "" }) },
    {
      label: options.find((option) => option.value === activeValue)?.label,
      clear: () => onChange({ region: null }),
    },
  );

  return (
    <ListPage title={toolbar.title}>
      <ListToolbar
        {...toolbar}
        {...layoutState}
        query={search.q}
        onQueryChange={(q, replace) => onChange({ q }, replace)}
        filters={
          <ListChoiceFilter
            {...choice}
            options={options}
            value={activeValue}
            onChange={(value) => onChange({ region: value ? Number(value) : null })}
          />
        }
      />
      <ListResultsSummary total={visible.length} unit="座星屿" chips={chips} onClear={clear} />
      <ListResults
        layout={layoutState.layout}
        resultKey={JSON.stringify([search.region, search.q])}
        rows={visible}
        columns={isletColumns(origin)}
        getRowId={(row) => String(row.id)}
        label="星屿表格"
        grid={grid}
        renderCard={(islet) => <IsletCard islet={islet} origin={origin} />}
        empty={<ListEmpty title="星屿" onClear={data.islets.length ? clear : undefined} />}
      />
    </ListPage>
  );
}
