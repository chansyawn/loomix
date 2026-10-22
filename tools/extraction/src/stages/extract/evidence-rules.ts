import { profile } from "../../tasks/content/config.ts";
import type { TableEvidence } from "../../tasks/content/types.ts";

export function associationRule(field: string, hint: TableEvidence): string {
  const root = profile.roots;
  if (["componentIds", "creatureIds", "plantIds", "dishIds"].includes(field))
    return `${hint.table}.${hint.table === root.ui ? 35 : 9} = collection ID; member ID in root93; same target category`;
  const joins: Record<number, string> = {
    [root.crops]: "144.10 product vector contains item ID",
    [root.recipes]: "122.4 product = item ID",
    [root.recipeDifficulty]: "122.4 product = item ID; 122.2 = 121.0 difficulty ID",
    [root.cookware]: "122.4 product = item ID; 122.16 = 126.2 cookware enum",
    [root.sources]: "325.0 = item ID; 325.2 vector contains 618.0 source ID",
    [root.qualities]: "325.0 = item ID; 325.15 = 83.1 quality enum",
    [root.categories]:
      "318.6/15 tags + GameplayTag ancestry match 33.5 category filter; 33.3=304 uses confirmed display label",
    [root.furnitureTypes]: "318.6 tags match 265.5; only if unmatched fall back to 265.3",
  };
  return `${joins[hint.table] ?? `${hint.table}.0 = item ID`}${hint.note ? `; ${hint.note}` : ""}`;
}

export function transformationRule(field: string): string {
  const rules: Record<string, string> = {
    id: "decode root93.0 as unsigned integer; preserve ID",
    name: "318.1 TextMap key → zh text → strip markup and trim",
    description:
      "first resolved 93.4 localized text, 186.6 string, 325.27 TextMap; strip markup and trim",
    quality:
      "325.15 unsigned integer; absent scalar defaults to 0 only when UI row exists; verify 83.1 enum",
    image:
      "exact Container/name and Persistent overlay; highest original width*height, preserve large-icon order on ties; retain PNG",
    size: "parse confirmed 尺寸_<w>_<h>a<decimal> tag; exactly one resolved value",
    type: "localize 265.2 and 265.4; join with ·; require one distinct label",
    category:
      "confirmed category display name or appearance tag ancestry; localize through TagUIData/TextMap",
    effects:
      "325.8 strength interpolated into TextMap 4027993099; 325.9 additional buff must be zero; strip markup",
    difficulty: "122.2 difficulty ID → 121.1 localized TextMap label",
    cookware: "122.16 → unique matching 126.2; use 126.1 string",
    harvestCount: "144.10 product vector membership → 144.5 unsigned integer",
    sizeRange: "unconfirmed display units/conversion; retain candidates, emit null",
    maturityPeriod: "unconfirmed stage timing/first-harvest rules; retain candidates, emit null",
    seriesName: "copy confirmed localized item name",
    setName: "copy confirmed localized item name",
  };
  if (field.endsWith("Ids"))
    return "explicit backreferences; retain root93 members in matching group; deduplicate and sort numeric IDs";
  return (
    rules[field] ??
    "decode configured field; resolve GameplayTag/TagUIData or ecological display key through localized TextMap; require every label; deduplicate and join with ，; unresolved emits null"
  );
}
