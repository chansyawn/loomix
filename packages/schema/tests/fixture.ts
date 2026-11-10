export function recordMetadata() {
  return {
    admissionReasons: ["manual" as const],
    clientType: 1,
    clientSecondaryType: null,
    tagIds: [] as number[],
  };
}
