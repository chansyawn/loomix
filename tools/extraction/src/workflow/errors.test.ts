import { expect, test } from "vite-plus/test";
import { z } from "zod";
import { errorDetails } from "./errors.ts";

test("validation diagnostics stay bounded for a malformed catalog", () => {
  const result = z
    .array(z.strictObject({ id: z.number(), description: z.string() }))
    .safeParse(Array.from({ length: 300 }, () => ({ id: null, description: null })));
  if (result.success) throw new Error("fixture should fail");
  const details = errorDetails(result.error);
  expect(details).toContain("600 validation issue(s)");
  expect(details).toContain("0.id");
  expect(details).toContain("Further issues omitted");
  expect(details.length).toBeLessThan(3000);
});

test("non-validation errors retain their diagnostic stack", () => {
  const error = new Error("missing source file");
  expect(errorDetails(error)).toBe(error.stack);
});
