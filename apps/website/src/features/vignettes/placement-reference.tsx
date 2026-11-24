import type { VignetteDetail } from "./view";

export function VignettePlacementRules({ rules }: { rules: VignetteDetail["placementRules"] }) {
  if (!rules.length) return null;
  return (
    <ul id="vignette-rules" aria-label="摆放规则" className="flex flex-wrap gap-2">
      {rules.map(({ id, label, targets }, index) => (
        <li
          key={`${id}-${index}`}
          className="flex min-w-0 flex-col gap-1 rounded-xl border bg-muted/40 px-3 py-2 text-sm wrap-anywhere"
        >
          <span className="font-medium">{label}</span>
          {targets.length > 0 && (
            <span className="text-muted-foreground">{targets.join("、")}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
