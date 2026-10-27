export interface GridLayout {
  breakpoints: readonly number[];
  className: string;
  estimateHeight: (cardWidth: number) => number;
  fixedHeight?: boolean;
  minWidth?: number;
}

export function compactGrid(extraHeight: number, fixedHeight = false): GridLayout {
  return {
    breakpoints: [336, 540, 740, 940, 1140],
    className:
      "grid grid-cols-1 gap-4 @min-[336px]:grid-cols-2 @min-[540px]:grid-cols-3 @min-[740px]:grid-cols-4 @min-[940px]:grid-cols-5 @min-[1140px]:grid-cols-6",
    estimateHeight: (width) => width + extraHeight,
    fixedHeight,
  };
}

export function wideGrid(extraHeight: number, imageRatio = 2): GridLayout {
  return {
    breakpoints: [600, 960],
    className: "grid grid-cols-1 gap-4 @min-[600px]:grid-cols-2 @min-[960px]:grid-cols-3",
    estimateHeight: (width) => width / imageRatio + extraHeight,
  };
}

export function gridGeometry(width: number, layout: GridLayout) {
  const columns = layout.minWidth
    ? Math.max(1, Math.floor((width + 16) / (layout.minWidth + 16)))
    : 1 + layout.breakpoints.filter((breakpoint) => width >= breakpoint).length;
  const cardWidth = (width - (columns - 1) * 16) / columns;
  return { columns, cardWidth, rowHeight: layout.estimateHeight(cardWidth) };
}

export function gridRow<T>(rows: readonly T[], index: number, columns: number): T[] {
  return rows.slice(index * columns, (index + 1) * columns);
}
