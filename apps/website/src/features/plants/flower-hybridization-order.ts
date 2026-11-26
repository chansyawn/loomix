const maxExactRowSize = 4;

type FlowerSlot = {
  id: number;
  routes: readonly { parentIds: readonly number[] }[];
};

type RowOrder<Slot> = {
  slots: readonly Slot[];
  positions: ReadonlyMap<number, number>;
  parentGroups: readonly (readonly number[])[];
};

type OrderState<Slot> = {
  order: RowOrder<Slot>;
  crossings: number;
  next?: OrderState<Slot>;
};

function permutations<Slot>(slots: readonly Slot[]): Slot[][] {
  if (!slots.length) return [[]];

  return slots.flatMap((slot, index) => {
    const rest = [...slots.slice(0, index), ...slots.slice(index + 1)];
    return permutations(rest).map((suffix) => [slot, ...suffix]);
  });
}

function rowOrder<Slot extends FlowerSlot>(slots: readonly Slot[]): RowOrder<Slot> {
  return {
    slots,
    positions: new Map(slots.map(({ id }, index) => [id, index])),
    parentGroups: slots.flatMap(({ routes }) => routes.map(({ parentIds }) => parentIds)),
  };
}

function crossingCount(upper: RowOrder<FlowerSlot>, lower: RowOrder<FlowerSlot>) {
  const earlierPositions: number[] = [];
  let crossings = 0;
  for (const parents of lower.parentGroups) {
    const positions = parents.map((id) => upper.positions.get(id)!);
    for (const position of positions) {
      for (const earlier of earlierPositions) {
        crossings += Number(earlier > position);
      }
    }
    earlierPositions.push(...positions);
  }
  return crossings;
}

function exactRowOrder<Slot extends FlowerSlot>(rows: readonly (readonly Slot[])[]) {
  let nextStates: OrderState<Slot>[] = [];
  for (const row of [...rows].reverse()) {
    nextStates = permutations(row).map((slots) => {
      const order = rowOrder(slots);
      if (!nextStates.length) return { order, crossings: 0 };

      let crossings = Infinity;
      let next: OrderState<Slot> | undefined;
      for (const candidate of nextStates) {
        const score = crossingCount(order, candidate.order) + candidate.crossings;
        if (score < crossings) {
          crossings = score;
          next = candidate;
        }
      }
      return { order, crossings, next };
    });
  }

  const orderedRows: (readonly Slot[])[] = [];
  let state: OrderState<Slot> | undefined = nextStates.reduce((best, candidate) =>
    candidate.crossings < best.crossings ? candidate : best,
  );
  while (state) {
    orderedRows.push(state.order.slots);
    state = state.next;
  }
  return orderedRows;
}

function swapAdjacentSlots<Slot extends FlowerSlot>(rows: readonly (readonly Slot[])[]) {
  const orders = rows.map(rowOrder);
  const indices = [...orders.keys()];
  for (const index of [...indices, ...[...indices].reverse()]) {
    const upper = orders[index - 1];
    const lower = orders[index + 1];
    const score = (order: RowOrder<Slot>) =>
      (upper ? crossingCount(upper, order) : 0) + (lower ? crossingCount(order, lower) : 0);

    let best = orders[index];
    let crossings = score(best);
    for (let position = 1; position < best.slots.length; position++) {
      const slots = [...best.slots];
      [slots[position - 1], slots[position]] = [slots[position], slots[position - 1]];
      const candidate = rowOrder(slots);
      const candidateCrossings = score(candidate);
      if (candidateCrossings < crossings) {
        best = candidate;
        crossings = candidateCrossings;
      }
    }
    orders[index] = best;
  }
  return orders.map(({ slots }) => slots);
}

export function orderFlowerHybridizationRows<Slot extends FlowerSlot>(
  rows: readonly (readonly Slot[])[],
) {
  if (rows.length < 2) return rows;
  return rows.some((row) => row.length > maxExactRowSize)
    ? swapAdjacentSlots(rows)
    : exactRowOrder(rows);
}
