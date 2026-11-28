import { Link } from "@tanstack/react-router";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { DishEffects } from "../dishes/effects";
import { NeighborAvatarLink } from "../neighbors/avatar-link";
import { GameplayRelationItem } from "../omnidex/gameplay-relation-item";
import { PurchasePrices } from "../omnidex/purchase-prices";
import type { DetailEntry, DetailField } from "./field-model";

function EntryList({ entries }: { entries: readonly DetailEntry[] }) {
  return (
    <ul className="flex flex-wrap items-start gap-x-4">
      {entries.map(({ key, links, ...item }) => (
        <li key={key} className="flex min-h-8 max-w-full min-w-0 flex-wrap items-center gap-x-2">
          <GameplayRelationItem {...item} variant="overview" />
          {links?.map(({ id, name, destination }) => (
            <Link key={id} {...destination} className="text-xs/6 underline underline-offset-4">
              {name}
            </Link>
          ))}
        </li>
      ))}
    </ul>
  );
}

export function FieldValue({ field }: { field: DetailField }) {
  switch (field.kind) {
    case "text":
      return <p className="py-1 whitespace-pre-line">{field.value}</p>;
    case "quantity":
      return (
        <p className="py-1 tabular-nums">
          {field.hash ? (
            <Link
              to="."
              hash={field.hash}
              search={true}
              state={true}
              resetScroll={false}
              className="underline underline-offset-4"
            >
              {field.value}
            </Link>
          ) : (
            field.value
          )}
        </p>
      );
    case "hint":
      return (
        <div
          role={field.live || field.retry ? "status" : undefined}
          className="py-1 whitespace-pre-line"
        >
          {field.value}
          {field.retry && (
            <Button variant="link" size="xs" className="ml-2" onClick={field.retry}>
              重试
            </Button>
          )}
        </div>
      );
    case "tags":
      return (
        <ul className="flex flex-wrap gap-x-1.5">
          {field.value.map(({ key, name, destination }) => (
            <li className="flex min-h-8 items-center" key={key}>
              <Badge
                variant="secondary"
                className="h-6"
                render={destination && <Link {...destination} />}
              >
                {name}
              </Badge>
            </li>
          ))}
        </ul>
      );
    case "neighbors":
      return (
        <>
          <ul className="flex flex-wrap gap-x-1">
            {field.value.map((neighbor) => (
              <li key={neighbor.id} className="flex items-center">
                <NeighborAvatarLink neighbor={neighbor} hash={field.hash} />
              </li>
            ))}
          </ul>
          {field.note && <p className="text-muted-foreground">{field.note}</p>}
        </>
      );
    case "entries": {
      const fold = field.moreLabel && field.value.length > 1;
      return (
        <>
          <EntryList entries={fold ? field.value.slice(0, 1) : field.value} />
          {fold && (
            <details>
              <summary className="cursor-pointer py-1">
                {field.moreLabel}（{field.value.length - 1}）
              </summary>
              <EntryList entries={field.value.slice(1)} />
            </details>
          )}
          {field.note && <p className="text-xs/6 text-muted-foreground">{field.note}</p>}
        </>
      );
    }
    case "effects":
      return <DishEffects effects={field.value} />;
    case "prices":
      return <PurchasePrices shops={field.value} />;
  }
}
