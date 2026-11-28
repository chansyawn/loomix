import { useEffect, useState, type RefObject } from "react";
import { findWikiScroll } from "@/infrastructure/wiki-scroll";

function anchorOffset(target: HTMLElement) {
  return Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
}

export function useReadingSection({
  contentRef,
  navigationRef,
  sectionsKey,
  hash,
  historyKey,
  revisit,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  navigationRef: RefObject<HTMLDivElement | null>;
  sectionsKey: string;
  hash: string;
  historyKey?: string;
  revisit: number;
}) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const content = contentRef.current;
    const navigation = navigationRef.current;
    const scrollport = findWikiScroll(content);
    if (!content || !scrollport) return;

    const sections = sectionsKey.split(" ").flatMap((id) => {
      if (!id) return [];
      const target = content.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      const container = target?.closest<HTMLElement>("[data-detail-section]");
      return target && container ? [{ id, target, container }] : [];
    });
    const first = sections[0];
    const last = sections.at(-1);
    if (!first || !last) return;

    const hashTarget = hash ? content.querySelector<HTMLElement>(`#${CSS.escape(hash)}`) : null;
    const hashSection =
      hashTarget?.closest<HTMLElement>("[data-detail-section]")?.dataset.detailSection;
    let landing: number | undefined;
    let pinHash = Boolean(hashSection);
    let frame: number | undefined;
    const measure = () => {
      frame = undefined;
      const { scrollTop, scrollHeight, clientHeight, clientTop } = scrollport;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      const top = scrollport.getBoundingClientRect().top + clientTop;
      if (pinHash && hashTarget && hashSection) {
        const targetTop = hashTarget.getBoundingClientRect().top - top + scrollTop;
        const targetScroll = Math.min(maxScroll, Math.max(0, targetTop - anchorOffset(hashTarget)));
        if (Math.abs(scrollTop - (landing ?? targetScroll)) <= 1) {
          landing ??= scrollTop;
          setActiveId(hashSection);
          return;
        }
        pinHash = false;
      }
      if (scrollTop > 1 && maxScroll - scrollTop <= 1) {
        setActiveId(last.id);
        return;
      }

      let current = first.id;
      for (const { id, target } of sections) {
        if (target.getBoundingClientRect().top <= top + anchorOffset(target) + 1) current = id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(scrollport);
    observer.observe(content);
    if (navigation) observer.observe(navigation);
    for (const { container } of sections) observer.observe(container);
    scrollport.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      scrollport.removeEventListener("scroll", schedule);
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [contentRef, navigationRef, sectionsKey, hash, historyKey, revisit]);

  return activeId;
}
