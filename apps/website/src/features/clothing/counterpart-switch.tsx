import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/components/button";
import { recordLocation } from "../collection/item-route";
import { useCollectionOrigin } from "../collection/navigation";
import type { ClothingCounterpart } from "./counterpart";

export function ClothingCounterpartSwitch({
  counterpart,
  currentId,
}: {
  counterpart: ClothingCounterpart;
  currentId: number;
}) {
  const origin = useCollectionOrigin();
  if (counterpart.kind === "player-link")
    return (
      <Link
        {...recordLocation({ id: counterpart.playerId })}
        state={{ collectionOrigin: origin }}
        resetScroll={false}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        查看对应玩家款
      </Link>
    );

  const options = [
    { id: counterpart.playerId, label: "玩家款" },
    { id: counterpart.neighborId, label: "友邻款" },
  ];
  return (
    <nav aria-label="服饰款式" className="inline-flex items-center gap-1 rounded-full border p-1">
      {options.map(({ id, label }) =>
        id === currentId ? (
          <span
            key={id}
            aria-current="page"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "pointer-events-none",
            })}
          >
            {label}
          </span>
        ) : (
          <Link
            key={id}
            {...recordLocation({ id })}
            state={{ collectionOrigin: origin }}
            resetScroll={false}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
