import { useLayoutEffect, useRef, useState } from "react";

export function useScrollGeometry<T extends HTMLElement>() {
  const container = useRef<T>(null);
  const [geometry, setGeometry] = useState<{
    width: number;
    scrollMargin: number;
    scrollElement: HTMLDivElement;
  } | null>(null);

  useLayoutEffect(() => {
    const element = container.current;
    const scrollElement = element?.closest<HTMLDivElement>("[data-scroll-restoration-id]");
    if (!element || !scrollElement) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const scrollMargin =
        rect.top -
        scrollElement.getBoundingClientRect().top -
        scrollElement.clientTop +
        scrollElement.scrollTop;
      setGeometry((previous) =>
        previous?.width === rect.width &&
        previous.scrollMargin === scrollMargin &&
        previous.scrollElement === scrollElement
          ? previous
          : { width: rect.width, scrollMargin, scrollElement },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(scrollElement);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, []);

  return { container, geometry };
}
