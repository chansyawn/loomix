import { Link } from "@tanstack/react-router";
import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { gameplayAnchor } from "@/features/omnidex/gameplay-anchors";
import { GameplayRelationItem } from "@/features/omnidex/gameplay-relation-item";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import type { VignetteDetail } from "./view";

export function VignettePlacementRules({ rules }: { rules: VignetteDetail["placementRules"] }) {
  if (!rules.length) return null;
  return (
    <section aria-labelledby="vignette-rules" className="flex min-w-0 flex-col gap-3">
      <h2 id="vignette-rules" className="text-lg font-semibold">
        摆放规则
      </h2>
      <ul className="divide-y rounded-2xl border">
        {rules.map(({ id, label, targets }, index) => (
          <li key={`${id}-${index}`} className="flex flex-col gap-1 p-3 text-sm">
            <span className="font-medium">{label}</span>
            {targets.length > 0 && (
              <span className="text-muted-foreground">{targets.join("、")}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VignetteReferenceItems({ entry }: { entry: VignetteDetail }) {
  const origin = useOmnidexOrigin();
  if (!entry.referenceItems.length) return null;
  return (
    <section aria-label="参考物品">
      <Accordion>
        <AccordionItem value="reference-items">
          <AccordionTrigger>参考物品</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4 px-1">
              {entry.referenceItems.map(({ position, items }) => (
                <section key={position} className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">
                    <Link
                      to="/vignettes/$id"
                      params={{ id: String(entry.id) }}
                      hash={gameplayAnchor("requirement", position)}
                      state={(previous) => ({ ...previous, omnidexOrigin: origin })}
                      className="rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {`要求 ${position} · ${entry.requirements[position - 1]?.label}`}
                    </Link>
                  </h3>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-2">
                    {items.map(({ item, quantity }, index) => (
                      <li key={`${item.id}-${index}`}>
                        <GameplayRelationItem
                          name={item.name}
                          image={item.image}
                          quantity={quantity}
                          note={item.browsable ? undefined : "无图鉴详情"}
                          destination={item.browsable ? catalogEntryLocation(item) : undefined}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
