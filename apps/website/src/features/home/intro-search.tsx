import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { site } from "@/site";
import planetLogo from "@/assets/planet-logo.png";
import { Button } from "@/ui/components/button";
import { SearchInput } from "@/ui/components/search-input";
import { createHomeSearch } from "./search";

export function IntroSearch() {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();
  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate overflow-hidden rounded-2xl border bg-linear-to-br from-primary/10 via-background to-background px-5 py-8 sm:px-8 sm:py-10"
    >
      {/* 素材来自 https://planet.mihoyo.com/ 官网，仅作装饰，避免影响搜索交互。 */}
      <img
        src={planetLogo}
        alt=""
        aria-hidden="true"
        width={205}
        height={87}
        draggable={false}
        className="pointer-events-none absolute top-1/2 right-8 -z-10 hidden w-56 -translate-y-1/2 opacity-40 grayscale select-none lg:block xl:right-12 xl:w-72 dark:opacity-40 dark:brightness-0 dark:invert"
      />
      <p className="mb-3 text-sm text-muted-foreground">{site.domain}</p>
      <h1
        id="home-title"
        className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {site.name}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">《星布谷地》非官方工具与资料站</p>
      <form
        role="search"
        aria-label="图鉴搜索"
        className="mt-6 flex max-w-2xl gap-2"
        onKeyDown={(event) => {
          // 中文输入法确认候选词的回车不应提交搜索。
          if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
            event.preventDefault();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const search = createHomeSearch(keyword);
          if (search) void navigate({ to: "/collections/all", search });
        }}
      >
        <SearchInput
          className="min-w-0 flex-1"
          ariaLabel="搜索图鉴"
          placeholder="搜索家具、服饰、料理、生物……"
          value={keyword}
          onValueChange={setKeyword}
        />
        <Button type="submit">
          搜索
          <ArrowRightIcon className="hidden sm:block" />
        </Button>
      </form>
    </section>
  );
}
