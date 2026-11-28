import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/components/button";

export function RelationPreview<Entry extends { id: number }>({
  entries,
  label,
  renderEntry,
}: {
  entries: readonly Entry[];
  label: string;
  renderEntry: (entry: Entry) => ReactNode;
}) {
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);
  const returnToStart = useRef(false);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    if (!expanded && returnToStart.current) {
      returnToStart.current = false;
      list.current?.scrollIntoView({ block: "start" });
    }
  }, [expanded]);
  return (
    <div className="grid gap-2">
      <ul
        ref={list}
        id={listId}
        aria-label={label}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3"
      >
        {(expanded ? entries : entries.slice(0, 4)).map((entry) => (
          <li key={entry.id} className="min-w-0">
            {renderEntry(entry)}
          </li>
        ))}
      </ul>
      {entries.length > 4 && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          aria-controls={listId}
          aria-expanded={expanded}
          onClick={() => {
            returnToStart.current = expanded;
            setExpanded(!expanded);
          }}
        >
          {expanded ? `收起${label}` : `展开全部 ${entries.length} 项${label}`}
        </Button>
      )}
    </div>
  );
}
