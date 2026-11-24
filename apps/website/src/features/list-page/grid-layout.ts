export interface GridLayout {
  breakpoints: readonly number[];
  className: string;
  estimateHeight: (cardWidth: number) => number;
}

export function compactGrid(extraHeight: number): GridLayout {
  return {
    breakpoints: [320, 488, 656, 824, 992, 1160],
    className:
      "grid grid-cols-1 gap-4 @min-[320px]:grid-cols-2 @min-[488px]:grid-cols-3 @min-[656px]:grid-cols-4 @min-[824px]:grid-cols-5 @min-[992px]:grid-cols-6 @min-[1160px]:grid-cols-7",
    estimateHeight: (width) => width + extraHeight,
  };
}

export function wideGrid(extraHeight: number): GridLayout {
  return {
    breakpoints: [464, 704, 944, 1184],
    className:
      "grid grid-cols-1 gap-4 @min-[464px]:grid-cols-2 @min-[704px]:grid-cols-3 @min-[944px]:grid-cols-4 @min-[1184px]:grid-cols-5",
    estimateHeight: (width) => width / 2 + extraHeight,
  };
}

export function gridGeometry(width: number, layout: GridLayout) {
  const columns = 1 + layout.breakpoints.filter((breakpoint) => width >= breakpoint).length;
  const cardWidth = (width - (columns - 1) * 16) / columns;
  return { columns, cardWidth, rowHeight: layout.estimateHeight(cardWidth) };
}

export function gridRow<T>(rows: readonly T[], index: number, columns: number): T[] {
  return rows.slice(index * columns, (index + 1) * columns);
}
