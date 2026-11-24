import { ListCard } from "@/features/list-page/list-card";
import { ListPage } from "@/features/list-page/page";
import { RecordImage } from "@/features/omnidex/record-image";
import { ListToolbar } from "@/features/list-page/toolbar";
import { choiceFilterChips, ListChoiceFilter } from "@/features/list-page/choice-filter";
import { ListResultsSummary } from "@/features/list-page/results-summary";
import { ListResults } from "@/features/list-page/results";
import { ListEmpty } from "@/features/list-page/states";
import { useListLayout } from "@/features/list-page/use-list-layout";
import {
  filterVignettes,
  vignetteSearchDefaults,
  vignetteSearchSchema,
  type VignetteSearch,
} from "./search";
import { siteLabels, type VignetteSummary } from "./view";
import { vignetteColumns, VignetteLink, vignetteListPresentation } from "./list-presentation";

export function VignetteListPage({
  entries,
  search,
  historyIndex,
  onChange,
}: {
  entries: VignetteSummary[];
  search: VignetteSearch;
  historyIndex: number;
  onChange: (patch: Partial<VignetteSearch>, replace?: boolean) => void;
}) {
  const visible = filterVignettes(entries, search);
  const origin = { search, index: historyIndex };
  const { toolbar, choice, options, grid } = vignetteListPresentation;
  const layoutState = useListLayout(search.layout, (layout) => onChange({ layout }));
  const clear = () => onChange(vignetteSearchDefaults);
  const chips = choiceFilterChips(
    { value: search.q, clear: () => onChange({ q: "" }) },
    {
      label: search.site ? siteLabels[search.site] : undefined,
      clear: () => onChange({ site: null }),
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
            value={search.site ?? ""}
            onChange={(value) =>
              onChange({ site: vignetteSearchSchema.shape.site.parse(value || null) })
            }
          />
        }
      />
      <ListResultsSummary total={visible.length} unit="处小栖地" chips={chips} onClear={clear} />
      <ListResults
        layout={layoutState.layout}
        resultKey={JSON.stringify([search.site, search.q])}
        rows={visible}
        columns={vignetteColumns(origin)}
        getRowId={(entry) => String(entry.id)}
        label="小栖地表格"
        grid={grid}
        renderCard={(entry) => (
          <ListCard
            name={entry.name}
            image={
              <RecordImage
                image={entry.image}
                name={entry.name}
                inset="none"
                className="aspect-2/1"
              />
            }
            titleLink={<VignetteLink entry={entry} origin={origin} />}
            tags={`${entry.size} · ${entry.stars} · ${entry.terrain}`}
          />
        )}
        empty={<ListEmpty title="小栖地" onClear={entries.length ? clear : undefined} />}
      />
    </ListPage>
  );
}
