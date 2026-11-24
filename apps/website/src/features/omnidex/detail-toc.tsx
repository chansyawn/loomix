import { createLink, useRouterState } from "@tanstack/react-router";
import { ListIcon } from "lucide-react";
import type { ComponentProps, MouseEvent, RefObject } from "react";
import type { DetailSection } from "./detail-layout";
import { DetailNavGroup } from "./detail-nav-group";
import { useReadingSection } from "./use-reading-section";

export const detailOverviewId = "detail-overview";

const SectionLink = createLink(function SectionAnchor({
  currentSection,
  ...props
}: ComponentProps<"a"> & { currentSection: boolean }) {
  return (
    <a
      {...props}
      aria-current={currentSection ? "location" : undefined}
      data-current={currentSection ? "" : undefined}
    />
  );
});

export function CatalogDetailToc({
  sections,
  contentRef,
}: {
  sections: readonly DetailSection[];
  contentRef: RefObject<HTMLDivElement | null>;
}) {
  const currentHash = useRouterState({ select: (state) => state.location.hash });
  const readingSection = useReadingSection(contentRef, detailOverviewId, sections);
  const targets = [{ id: detailOverviewId, title: "概览" }, ...sections];
  const current =
    readingSection ??
    (targets.some(({ id }) => id === currentHash) ? currentHash : detailOverviewId);
  function revisitSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      id !== currentHash ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView();
  }
  const items = targets.map(({ id, title }) => ({
    key: id,
    label: title,
    link: (
      <SectionLink
        to="."
        hash={id}
        search={true}
        state={true}
        resetScroll={false}
        preload={false}
        onClick={(event) => revisitSection(event, id)}
        currentSection={id === current}
      >
        {title}
      </SectionLink>
    ),
  }));

  return (
    <DetailNavGroup
      title="目录"
      label="页面目录"
      icon={ListIcon}
      lists={[{ key: "sections", items }]}
    />
  );
}
