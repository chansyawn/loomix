import { loadEnvFile } from "node:process";

export function loadEnvironment(file: string | URL = new URL("../.env", import.meta.url)): void {
  try {
    loadEnvFile(file);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}
