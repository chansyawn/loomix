import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { atomicJson, verifyFiles } from "./manifests.ts";
import { digest, inventory } from "./hashing.ts";
import type { FileHash } from "./hashing.ts";
import { within } from "./paths.ts";

const checkpointSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  input: z.string(),
  dependencies: z.array(z.string()),
  outputs: z.array(z.object({ path: z.string(), sha256: z.string(), bytes: z.number() })),
});
export type Checkpoint = z.infer<typeof checkpointSchema>;
export interface CheckpointTask {
  name: string;
  dependencies: string[];
  run: () => Promise<void>;
  outputs: () => string[];
}

export async function runCheckpoints(
  root: string,
  identity: string,
  tasks: CheckpointTask[],
): Promise<FileHash[]> {
  const completed = new Map<string, Checkpoint>();
  const invalidated = new Set<string>();
  for (const task of tasks) {
    const dependencies = task.dependencies.map((name) => {
      const dependency = completed.get(name);
      if (!dependency) throw new Error(`Missing checkpoint dependency: ${name}`);
      return digest(dependency);
    });
    const input = digest({ identity, dependencies });
    const file = within(root, `checkpoints/${task.name}.json`);
    let checkpoint: Checkpoint | undefined;
    try {
      const existing = checkpointSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
      if (
        existing.name !== task.name ||
        existing.input !== input ||
        task.dependencies.some((name) => invalidated.has(name))
      )
        throw new Error("Changed checkpoint inputs");
      await verifyFiles(root, existing.outputs);
      if (
        JSON.stringify(existing.outputs.map((output) => output.path).sort()) !==
        JSON.stringify(task.outputs().sort())
      )
        throw new Error("Changed checkpoint file set");
      checkpoint = existing;
      console.log(`[${task.name}] verified checkpoint`);
    } catch {
      invalidated.add(task.name);
      // Remove all downstream markers before touching their inputs, including after a failed task.
      const downstream = new Set([task.name]);
      for (const candidate of tasks)
        if (candidate.dependencies.some((name) => downstream.has(name)))
          downstream.add(candidate.name);
      for (const name of downstream)
        fs.rmSync(path.join(root, "checkpoints", `${name}.json`), { force: true });
    }
    if (!checkpoint) {
      console.log(`[${task.name}] running`);
      await task.run();
      checkpoint = {
        schemaVersion: 1,
        name: task.name,
        input,
        dependencies,
        outputs: await inventory(root, task.outputs()),
      };
      atomicJson(file, checkpoint);
    }
    completed.set(task.name, checkpoint);
  }
  return [...completed.values()].flatMap((checkpoint) => checkpoint.outputs);
}
