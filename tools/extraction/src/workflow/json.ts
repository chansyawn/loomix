import fs from "node:fs";
import path from "node:path";

export const readJson = <T = unknown>(file: string): T =>
  JSON.parse(fs.readFileSync(file, "utf8")) as T;

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
