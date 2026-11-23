export interface GridLayout {
  breakpoints: readonly number[];
  className: string;
  estimateHeight: (cardWidth: number) => number;
}

export function compactGrid(extraHeight: number): GridLayout {
  return {
    breakpoints: [368, 560, 752, 944, 1136],
    className:
      "grid grid-cols-1 gap-4 @min-[368px]:grid-cols-2 @min-[560px]:grid-cols-3 @min-[752px]:grid-cols-4 @min-[944px]:grid-cols-5 @min-[1136px]:grid-cols-6",
    estimateHeight: (width) => width + extraHeight,
  };
}

export function wideGrid(extraHeight: number): GridLayout {
  return {
    breakpoints: [592, 896, 1200],
    className:
      "grid grid-cols-1 gap-4 @min-[592px]:grid-cols-2 @min-[896px]:grid-cols-3 @min-[1200px]:grid-cols-4",
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
