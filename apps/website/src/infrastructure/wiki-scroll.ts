export const wikiScrollId = "wiki-content";
export const wikiScrollSelector = `[data-scroll-restoration-id="${wikiScrollId}"]`;

export function findWikiScroll(element: Element | null) {
  return element?.closest<HTMLElement>(wikiScrollSelector) ?? null;
}
