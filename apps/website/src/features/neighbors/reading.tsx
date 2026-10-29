import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/components/accordion";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { StoryText } from "./rich-text";

export function NeighborStories({ neighbor }: { neighbor: NeighborDetail }) {
  return (
    <section id="stories" className="scroll-mt-4 space-y-4" aria-labelledby="stories-heading">
      <h2 id="stories-heading" className="text-2xl font-semibold">
        友邻故事
      </h2>
      <p className="text-sm text-muted-foreground">以下内容包含剧情，展开章节后阅读。</p>
      {neighbor.stories.length ? (
        <Accordion multiple>
          {neighbor.stories.map((story) => (
            <AccordionItem key={story.key} value={story.key}>
              <AccordionTrigger>
                第 {story.chapter} 章 · {story.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 px-3 md:px-6">
                  {story.paragraphs.map((paragraph) => (
                    <div key={paragraph.sequence} className="space-y-4">
                      {paragraph.text && <StoryText text={paragraph.text} />}
                      {paragraph.hasIllustration && (
                        <NeighborImage
                          image={paragraph.image}
                          name={`${story.title} · 插图 ${paragraph.sequence}`}
                          className="min-h-32"
                        />
                      )}
                    </div>
                  ))}
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

export function NeighborTravel({ neighbor }: { neighbor: NeighborDetail }) {
  return (
    <section id="travel" className="scroll-mt-4 space-y-4" aria-labelledby="travel-heading">
      <h2 id="travel-heading" className="text-2xl font-semibold">
        旅行台词
      </h2>
      <p className="text-sm text-muted-foreground">
        按旅行事件整理，原始触发参数不代表送礼偏好或能力。
      </p>
      {neighbor.travel.length ? (
        <Accordion multiple>
          {neighbor.travel.map((group) => (
            <AccordionItem key={group.key} value={group.key}>
              <AccordionTrigger>
                {group.name}（{group.reactions.length} 条）
              </AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y px-3 md:px-6">
                  {group.reactions.map((reaction) => (
                    <li key={reaction.key} className="space-y-2 py-4">
                      <p className="leading-7 wrap-anywhere whitespace-pre-wrap">{reaction.text}</p>
                      {reaction.parameters && (
                        <p className="text-xs text-muted-foreground">
                          原始触发参数 · {reaction.parameters}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="rounded-2xl border p-6 text-muted-foreground">
          当前资料暂未收录角色专属旅行台词
        </p>
      )}
    </section>
  );
}
