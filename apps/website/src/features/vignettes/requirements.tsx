import { ChevronDownIcon } from "lucide-react";
import { TableFrame } from "@/features/list-page/table-frame";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { gameplayAnchor, useGameplayAccordion } from "@/features/omnidex/gameplay-anchors";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import { Button } from "@/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import type { VignetteDetail } from "./view";

type Requirement = VignetteDetail["requirements"][number];
type DisplayItem = Extract<Requirement["target"], { kind: "tags" }>["matches"][number];

const columns = [
  { label: "物品", className: "w-1/3" },
  { label: "显示数量", className: "w-20 text-center" },
  { label: "示例", className: "w-44" },
  { label: "摆放规则" },
];

function MatchingItems({ id, label, items }: { id: string; label: string; items: DisplayItem[] }) {
  return (
    <ul
      id={id}
      aria-label={`${label}的匹配物品`}
      tabIndex={0}
      className="sticky inset-s-0 grid max-h-80 w-[100cqi] scrollbar-gutter-both grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2 overflow-y-auto overscroll-y-contain py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <GameplayRelationItem
            name={item.name}
            image={item.image}
            note={item.browsable ? undefined : "无图鉴详情"}
            destination={item.browsable ? catalogEntryLocation(item) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}

function RequirementRows({
  requirement: { label, target, support, sizeLabel, quantity, examples, instructions },
  position,
  anchor,
  open,
  onToggle,
}: {
  requirement: Requirement;
  position: number;
  anchor: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panel = `${anchor}-matches`;
  const name = target.kind === "item" ? target.item.name : label;
  const matches = target.kind === "tags" ? target.matches : [];
  const matchCount = matches.length;
  const expanded = matchCount > 0 && open;

  return (
    <>
      <TableRow id={anchor}>
        <TableHead scope="row" className="h-auto wrap-anywhere whitespace-normal">
          <div className="flex items-center gap-1">
            <span className="min-w-0 font-semibold">{name}</span>
            {matchCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label={`${expanded ? "收起" : "展开"}${name}的 ${matchCount} 个匹配物品`}
                aria-expanded={expanded}
                aria-controls={expanded ? panel : undefined}
                onClick={onToggle}
              >
                <span className="tabular-nums">{matchCount}</span>
                <ChevronDownIcon
                  data-icon="inline-end"
                  aria-hidden="true"
                  className="group-aria-expanded/button:rotate-180"
                />
              </Button>
            ) : target.kind === "tags" ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="sr-only">匹配数量：</span>
                {matchCount}
              </span>
            ) : null}
          </div>
        </TableHead>
        <TableCell className="text-center">
          <span className="font-semibold tabular-nums">×{quantity}</span>
        </TableCell>
        <TableCell>
          {examples.length ? (
            <ul className="flex flex-col gap-1.5">
              {examples.map(({ item, quantity: exampleQuantity }, exampleIndex) => (
                <li key={`${item.id}-${exampleIndex}`}>
                  <GameplayRelationItem
                    name={item.name}
                    image={item.image}
                    quantity={exampleQuantity}
                    variant="inline"
                    destination={item.browsable ? catalogEntryLocation(item) : undefined}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="wrap-anywhere whitespace-normal">
          {sizeLabel || support || instructions.length ? (
            <ul className="flex flex-col gap-1">
              {sizeLabel && <li>尺寸 {sizeLabel}</li>}
              {support && (
                <li id={gameplayAnchor("vignette-support", position)}>放在{support}上</li>
              )}
              {instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <td colSpan={columns.length}>
            <MatchingItems id={panel} label={name} items={matches} />
          </td>
        </TableRow>
      )}
    </>
  );
}

export function VignetteRequirements({ requirements }: { requirements: Requirement[] }) {
  const expansion = useGameplayAccordion(
    "requirement",
    requirements.map((_, index) => index + 1),
  );

  return (
    <TableFrame className="@container">
      <Table aria-label="布景要求" className="min-w-md table-fixed">
        <TableHeader>
          <TableRow>
            {columns.map(({ label, className }) => (
              <TableHead key={label} scope="col" className={className}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((requirement, index) => {
            const position = index + 1;
            const anchor = gameplayAnchor("requirement", position);
            const open = expansion.value.includes(anchor);
            return (
              <RequirementRows
                key={anchor}
                requirement={requirement}
                position={position}
                anchor={anchor}
                open={open}
                onToggle={() =>
                  expansion.onValueChange(
                    open
                      ? expansion.value.filter((id) => id !== anchor)
                      : [...expansion.value, anchor],
                  )
                }
              />
            );
          })}
        </TableBody>
      </Table>
    </TableFrame>
  );
}
