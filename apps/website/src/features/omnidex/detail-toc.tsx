import { Link, useRouterState } from "@tanstack/react-router";
import { CheckIcon, ListIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { ScrollFade } from "@/ui/components/scroll-fade";
import type { DetailSection } from "./detail-layout";

export function CatalogDetailToc({ sections }: { sections: readonly DetailSection[] }) {
  const currentHash = useRouterState({ select: (state) => state.location.hash });
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
  const targets = [{ id: "detail-overview", title: "概览" }, ...sections];
  const links = targets.map(({ id, title }) => {
    const current = id === currentHash || (!currentHash && id === "detail-overview");
    return {
      id,
      title,
      current,
      props: {
        to: "." as const,
        hash: id,
        search: true as const,
        state: true as const,
        resetScroll: false,
        preload: false as const,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => revisitSection(event, id),
        "aria-current": current ? ("location" as const) : undefined,
      },
    };
  });

  return (
    <nav aria-label="页面目录" className="py-1.5">
      <div className="@min-[40rem]/catalog-detail:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-11" />}>
            <ListIcon data-icon="inline-start" />
            目录
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {links.map(({ id, title, current, props }) => (
                <DropdownMenuItem
                  key={id}
                  render={<Link {...props} />}
                  className="min-h-11 justify-between"
                >
                  {title}
                  {current && <CheckIcon aria-hidden="true" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden @min-[40rem]/catalog-detail:flex @min-[40rem]/catalog-detail:items-center @min-[40rem]/catalog-detail:gap-3">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">目录</span>
        <ScrollFade label="章节链接">
          <div className="flex items-center gap-1 py-1">
            {links.map(({ id, title, props }) => (
              <Link
                key={id}
                {...props}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=location]:bg-muted aria-[current=location]:font-medium aria-[current=location]:text-foreground"
              >
                {title}
              </Link>
            ))}
          </div>
        </ScrollFade>
      </div>
    </nav>
  );
}
