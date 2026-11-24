import { expect, it } from "vite-plus/test";
import { listSort, recordTableSorting, tableSorting } from "./sort";

it("round trips supported sorts and clears unsupported table sorting", () => {
  for (const sort of ["original", "name-asc", "name-desc", "quality-asc", "quality-desc"] as const)
    expect(listSort(tableSorting(sort))).toBe(sort);
  expect(listSort([{ id: "category", desc: false }])).toBe("original");
  recordTableSorting("name-asc", (sort) => expect(sort).toBe("name-desc")).onChange((previous) =>
    previous.map((sort) => ({ ...sort, desc: true })),
  );
});
