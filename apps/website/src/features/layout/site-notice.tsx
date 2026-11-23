import { InfoIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";

const noticeTitle = "网站声明";
const licenseUrl = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans";

function SiteNoticeText() {
  return (
    <div className="flex flex-col gap-2">
      <p>
        络米星集是由《星布谷地》游戏爱好者维护的非官方工具与资料站。网站所涉及的公司名称、商标、产品等均为其各自所有者的资产，仅供识别。
      </p>
      <p>
        网站内使用的游戏图片、动画、音频、文本原文等素材，仅用于更好地展示和介绍游戏资料，其版权归属于上海米哈游网络科技股份有限公司及其关联公司或相应权利人。
      </p>
      <p>
        除非另有声明，网站其他原创内容采用
        <a href={licenseUrl} className="px-1 text-foreground underline underline-offset-2">
          CC BY-NC-SA 4.0
        </a>
        授权。
      </p>
    </div>
  );
}

export function SiteNoticeFooter() {
  const headingId = useId();

  return (
    <footer aria-labelledby={headingId} className="border-t border-border pt-5">
      <h2 id={headingId} className="mb-2 font-heading text-sm font-semibold">
        {noticeTitle}
      </h2>
      <div className="text-sm/relaxed text-muted-foreground">
        <SiteNoticeText />
      </div>
    </footer>
  );
}

export function SiteNoticePopover() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={noticeTitle}
        openOnHover
        render={<Button variant="ghost" size="icon" />}
      >
        <InfoIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="max-h-(--available-height) w-[min(24rem,var(--available-width))] overflow-y-auto"
      >
        <PopoverTitle>{noticeTitle}</PopoverTitle>
        <SiteNoticeText />
      </PopoverContent>
    </Popover>
  );
}
