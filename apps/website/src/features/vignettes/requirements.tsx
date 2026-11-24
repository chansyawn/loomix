import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Fragment } from "react";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { gameplayAnchor, useGameplayAccordion } from "@/features/omnidex/gameplay-anchors";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import { Badge } from "@/ui/components/badge";
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
type DisplayItem = Requirement["examples"][number]["item"];

function MatchingItems({ id, label, items }: { id: string; label: string; items: DisplayItem[] }) {
  return (
    <ul
      id={id}
      aria-label={`${label}的匹配物品`}
      tabIndex={0}
      className="grid max-h-80 max-w-[calc(100cqw-1.5rem)] grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2 overflow-y-auto overscroll-contain focus-visible:outline-ring"
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

export function VignetteRequirements({ requirements }: { requirements: Requirement[] }) {
  const expansion = useGameplayAccordion(
    "requirement",
    requirements.map((_, index) => index + 1),
  );

  return (
    <div className="@container min-w-0 rounded-2xl border">
      <Table aria-label="布景要求" className="min-w-3xl table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-12">
              <span className="sr-only">展开匹配物品</span>
            </TableHead>
            <TableHead scope="col" className="w-[14%]">
              物品
            </TableHead>
            <TableHead scope="col" className="w-16 text-center">
              数量
            </TableHead>
            <TableHead scope="col" className="w-24 text-center">
              匹配数量
            </TableHead>
            <TableHead scope="col" className="w-[12%]">
              标签
            </TableHead>
            <TableHead scope="col" className="w-[34%]">
              示例
            </TableHead>
            <TableHead scope="col">摆放规则</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map(
            ({ label, target, support, sizeLabel, quantity, examples, instructions }, index) => {
              const anchor = gameplayAnchor("requirement", index + 1);
              const panel = `${anchor}-matches`;
              const name = target.kind === "item" ? target.item.name : label;
              const matches = target.kind === "tags" ? target.matches : [];
              const tags = target.kind === "tags" ? target.labels : [];
              const expanded = matches.length > 0 && expansion.value.includes(anchor);
              return (
                <Fragment key={anchor}>
                  <TableRow id={anchor}>
                    <TableCell className="text-center">
                      {matches.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${expanded ? "收起" : "展开"}${name}的匹配物品`}
                          aria-expanded={expanded}
                          aria-controls={expanded ? panel : undefined}
                          onClick={() =>
                            expansion.onValueChange(
                              expanded
                                ? expansion.value.filter((id) => id !== anchor)
                                : [...expansion.value, anchor],
                            )
                          }
                        >
                          {expanded ? (
                            <ChevronDownIcon aria-hidden="true" />
                          ) : (
                            <ChevronRightIcon aria-hidden="true" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableHead scope="row" className="h-auto whitespace-normal">
                      <span className="font-semibold">{name}</span>
                    </TableHead>
                    <TableCell className="text-center">
                      <span className="font-semibold tabular-nums">×{quantity}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums">
                        {target.kind === "item" ? 1 : matches.length}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {tags.length || sizeLabel ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                          {sizeLabel && <Badge variant="secondary">尺寸 {sizeLabel}</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {examples.length ? (
                        <ul className="space-y-1.5">
                          {examples.map(({ item, quantity: exampleQuantity }, exampleIndex) => (
                            <li key={`${item.id}-${exampleIndex}`}>
                              <GameplayRelationItem
                                name={item.name}
                                image={item.image}
                                quantity={exampleQuantity}
                                singleLine
                                destination={
                                  item.browsable ? catalogEntryLocation(item) : undefined
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {support || instructions.length ? (
                        <ul className="space-y-1">
                          {support && (
                            <li id={gameplayAnchor("vignette-support", index + 1)}>
                              放在{support}上
                            </li>
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
                      <TableCell colSpan={7} className="whitespace-normal">
                        <MatchingItems id={panel} label={name} items={matches} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            },
          )}
        </TableBody>
      </Table>
    </div>
  );
}
