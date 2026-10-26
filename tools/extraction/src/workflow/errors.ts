export function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function errorDetails(error: Error): string {
  if (!("issues" in error) || !Array.isArray(error.issues)) return error.stack ?? error.message;
  const issues: unknown[] = error.issues;
  const details = issues.slice(0, 8).map((issue) => {
    if (typeof issue !== "object" || issue === null || !("message" in issue))
      return "Invalid input";
    const field = "path" in issue && Array.isArray(issue.path) ? issue.path.join(".") : "input";
    return `${field || "input"}: ${String(issue.message).slice(0, 300)}`;
  });
  return `${error.name}: ${issues.length} validation issue(s)\n${details.join("\n")}${issues.length > 8 ? "\nFurther issues omitted" : ""}`;
}
