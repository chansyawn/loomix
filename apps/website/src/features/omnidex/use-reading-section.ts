import { useEffect, useState, type RefObject } from "react";

export function useReadingSection(
  contentRef: RefObject<HTMLDivElement | null>,
  overviewId: string,
  sections: readonly { id: string }[],
) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const content = contentRef.current;
    const scrollport = content?.closest<HTMLElement>('[data-scroll-restoration-id="wiki-content"]');
    if (!content || !scrollport) return;

    const headings = [overviewId, ...sections.map(({ id }) => id)]
      .map((id) => content.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter((heading) => heading !== null);
    const first = headings[0];
    const last = headings.at(-1);
    if (!first || !last) return;

    let frame: number | undefined;
    const measure = () => {
      frame = undefined;
      const { scrollTop, scrollHeight, clientHeight, clientTop } = scrollport;
      if (scrollTop > 1 && scrollHeight - clientHeight - scrollTop <= 1) {
        setActiveId(last.id);
        return;
      }

      const offset = Number.parseFloat(getComputedStyle(first).scrollMarginTop);
      const readingLine = scrollport.getBoundingClientRect().top + clientTop + offset + 1;
      let current = overviewId;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > readingLine) break;
        current = heading.id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(scrollport);
    observer.observe(content);
    for (const heading of headings.slice(1)) {
      if (heading.parentElement) observer.observe(heading.parentElement);
    }
    scrollport.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      scrollport.removeEventListener("scroll", schedule);
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [contentRef, overviewId, sections]);

  return activeId;
}
