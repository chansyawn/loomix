import { useState } from "react";
import { cn } from "cn";

interface HalfProps {
  digit: string;
  position: "top" | "bottom";
  className?: string;
}

// 只截取数字的上半或下半：内层高度为外层的 200%，再贴靠对应边缘
function Half({ digit, position, className }: HalfProps) {
  const isTop = position === "top";
  return (
    <div
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden bg-muted backface-hidden",
        isTop ? "top-0 rounded-t-md" : "bottom-0 rounded-b-md",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 flex h-[200%] items-center justify-center",
          isTop ? "top-0" : "bottom-0",
        )}
      >
        {digit}
      </span>
    </div>
  );
}

interface FlipDigitProps {
  digit: string;
}

/** 翻页数字。字体大小与颜色由父级继承，尺寸以 em 计算。 */
export function FlipDigit({ digit }: FlipDigitProps) {
  // 在渲染期对比上一次的值来记录「翻页前」的数字，避免在渲染中读写 ref
  const [pair, setPair] = useState({ current: digit, previous: digit });
  if (pair.current !== digit) {
    setPair({ current: digit, previous: pair.current });
  }

  const { current, previous } = pair;
  const isFlipping = current !== previous;

  return (
    <span className="relative inline-block h-[1.4em] w-[0.7em] perspective-near">
      <Half digit={current} position="top" />
      <Half digit={previous} position="bottom" className="motion-reduce:hidden" />
      {/* 减弱动态效果时不播放翻页，下半部分直接显示新值 */}
      <Half digit={current} position="bottom" className="hidden motion-reduce:block" />
      {isFlipping && (
        // 以新值为 key，每次变化都重新挂载并重播动画
        <span key={current} className="contents">
          <Half
            digit={previous}
            position="top"
            className="z-10 origin-bottom animate-flip-top motion-reduce:hidden"
          />
          <Half
            digit={current}
            position="bottom"
            className="z-10 origin-top animate-flip-bottom motion-reduce:hidden"
          />
        </span>
      )}
      <span className="absolute inset-x-0 top-1/2 z-20 h-px bg-background/70" aria-hidden="true" />
    </span>
  );
}
