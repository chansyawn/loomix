import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/ui/components/button";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { useOmnidexOrigin } from "../omnidex/navigation";
import type { ClothingCounterpart } from "./counterpart";

export function ClothingCounterpartSwitch({
  counterpart,
  currentId,
}: {
  counterpart: ClothingCounterpart;
  currentId: number;
}) {
  const origin = useOmnidexOrigin();
  if (counterpart.kind === "player-link")
    return (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <Link
            {...catalogEntryLocation({ id: counterpart.playerId })}
            state={{ omnidexOrigin: origin }}
            resetScroll={false}
          />
        }
      >
        查看对应玩家款
      </Button>
    );

  const options = [
    { id: counterpart.playerId, label: "玩家款" },
    { id: counterpart.neighborId, label: "友邻款" },
  ];
  return (
    <nav aria-label="服饰款式" className="inline-flex flex-wrap items-center gap-1">
      {options.map(({ id, label }) =>
        id === currentId ? (
          <span
            key={id}
            aria-current="page"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {label}
          </span>
        ) : (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link
                {...catalogEntryLocation({ id })}
                state={{ omnidexOrigin: origin }}
                resetScroll={false}
              />
            }
          >
            {label}
          </Button>
        ),
      )}
    </nav>
  );
}
