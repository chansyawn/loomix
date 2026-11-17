import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import type { NeighborDetail } from "./data";
import { StoryParagraph } from "./story-paragraph";

export function NeighborStories({ neighbor }: { neighbor: NeighborDetail }) {
  return (
    <section id="stories" className="scroll-mt-4 space-y-4" aria-labelledby="stories-heading">
      <h2 id="stories-heading" className="text-lg font-semibold">
        友邻故事
      </h2>
      {neighbor.stories.length ? (
        <Accordion multiple>
          {neighbor.stories.map((story) => (
            <AccordionItem key={story.chapter} value={String(story.chapter)}>
              <AccordionTrigger>
                第 {story.chapter} 章 · {story.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="@container mx-auto max-w-240 px-3 md:px-6">
                  <div className="space-y-6 text-base [&_p]:mb-0!">
                    {story.paragraphs.map((paragraph, index) => (
                      <StoryParagraph
                        key={index}
                        paragraph={paragraph}
                        sequence={index + 1}
                        title={story.title}
                      />
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="rounded-2xl border p-6 text-muted-foreground">当前资料暂未收录友邻故事</p>
      )}
    </section>
  );
}
