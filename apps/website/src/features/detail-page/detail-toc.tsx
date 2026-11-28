import { createLink, useRouterState } from "@tanstack/react-router";
import { ListIcon } from "lucide-react";
import { useState, type ComponentProps, type MouseEvent, type RefObject } from "react";
import { DetailNavGroup } from "./detail-nav-group";
import { useReadingSection } from "./use-reading-section";

type DetailTocEntry = { id: string; title: string };

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

export function DetailToc({
  targets,
  contentRef,
  navigationRef,
}: {
  targets: readonly DetailTocEntry[];
  contentRef: RefObject<HTMLDivElement | null>;
  navigationRef: RefObject<HTMLDivElement | null>;
}) {
  const { hash, historyKey } = useRouterState({
    select: ({ location }) => ({ hash: location.hash, historyKey: location.state.__TSR_key }),
    structuralSharing: true,
  });
  const [revisit, setRevisit] = useState(0);
  const targetIds = targets.map(({ id }) => id);
  const sectionsKey = targetIds.join(" ");
  const readingSection = useReadingSection({
    contentRef,
    navigationRef,
    sectionsKey,
    hash,
    historyKey,
    revisit,
  });
  const current =
    (readingSection && targetIds.includes(readingSection) ? readingSection : undefined) ??
    (targetIds.includes(hash) ? hash : targetIds[0]);
  function revisitSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      id !== hash ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    contentRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView();
    setRevisit((previous) => previous + 1);
  }
  function sectionLink({ id, title }: DetailTocEntry) {
    return {
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
    };
  }
  const items = targets.map(sectionLink);

  return (
    <DetailNavGroup
      title="目录"
      label="页面目录"
      icon={ListIcon}
      lists={[{ key: "sections", items }]}
    />
  );
}
