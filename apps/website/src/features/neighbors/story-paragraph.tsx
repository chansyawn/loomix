import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { StoryText } from "./rich-text";

type Paragraph = NeighborDetail["stories"][number]["paragraphs"][number];

export function StoryParagraph({ paragraph, title }: { paragraph: Paragraph; title: string }) {
  const { layout, text } = paragraph;
  const illustration = layout !== "text" && (
    <NeighborImage
      image={paragraph.image}
      name={`${title} · 插图 ${paragraph.sequence}`}
      className={
        layout === "portrait-image"
          ? "mx-auto aspect-2/3 w-full max-w-86.5"
          : layout === "image"
            ? "mx-auto aspect-square w-full max-w-lg"
            : "mx-auto aspect-square w-full max-w-90"
      }
    />
  );
  const content = text && <StoryText text={text} />;
  return (
    <div
      className={
        layout === "image-left"
          ? "grid items-start gap-5 @3xl:grid-cols-[minmax(0,18fr)_minmax(0,29fr)]"
          : layout === "image-right"
            ? "grid items-start gap-5 @3xl:grid-cols-[minmax(0,29fr)_minmax(0,18fr)]"
            : "space-y-5"
      }
    >
      {layout === "image-left" ? illustration : content}
      {layout === "image-left" ? content : illustration}
    </div>
  );
}
