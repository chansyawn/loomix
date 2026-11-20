import { createNameMatcher } from "@/infrastructure/name-search";
import type { StarseaSearch } from "./search";
import type { StarseaIslet } from "./view";

export function filterIslets(
  islets: StarseaIslet[],
  { q, region }: Pick<StarseaSearch, "q" | "region">,
) {
  const matchesName = createNameMatcher(q);
  return islets.filter(
    (islet) =>
      (region === null || islet.regions.some(({ id }) => id === region)) && matchesName(islet.name),
  );
}
