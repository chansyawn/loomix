import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/ui/lib/utils";

export function ScrollFade({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const scrollLeft = Math.max(0, Math.min(viewport.scrollLeft, maxScroll));
      const left = scrollLeft > 1;
      const right = maxScroll - scrollLeft > 1;
      setEdges((previous) =>
        previous.left === left && previous.right === right ? previous : { left, right },
      );
    };
    measure();
    viewport.addEventListener("scroll", measure, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(viewport);
    observer?.observe(content);
    return () => {
      viewport.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={viewportRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="scroll-px-6 scrollbar-none overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div ref={contentRef} className="w-max min-w-full">
          {children}
        </div>
      </div>
      {edges.left && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-background to-transparent"
        />
      )}
      {edges.right && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent"
        />
      )}
    </div>
  );
}
