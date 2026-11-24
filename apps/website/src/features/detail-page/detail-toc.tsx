import { createLink, useRouterState } from "@tanstack/react-router";
import { ListIcon } from "lucide-react";
import { useState, type ComponentProps, type MouseEvent, type RefObject } from "react";
import { DetailNavGroup } from "./detail-nav-group";
import { useReadingSection } from "./use-reading-section";

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
  targets: readonly { id: string; title: string }[];
  contentRef: RefObject<HTMLDivElement | null>;
  navigationRef: RefObject<HTMLDivElement | null>;
}) {
  const { hash, historyKey } = useRouterState({
    select: ({ location }) => ({ hash: location.hash, historyKey: location.state.__TSR_key }),
    structuralSharing: true,
  });
  const [revisit, setRevisit] = useState(0);
  const sectionsKey = targets.map(({ id }) => id).join(" ");
  const readingSection = useReadingSection({
    contentRef,
    navigationRef,
    sectionsKey,
    hash,
    historyKey,
    revisit,
  });
  const current =
    (targets.some(({ id }) => id === readingSection) ? readingSection : undefined) ??
    (targets.some(({ id }) => id === hash) ? hash : targets[0]?.id);
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
