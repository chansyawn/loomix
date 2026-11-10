export function recordMetadata() {
  return {
    admissionReasons: ["manual" as const],
    clientType: 1,
    clientSecondaryType: null,
    gameplayTagGroups: ([6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map((field) => ({
      field,
      tagIds: [] as number[],
    })),
  };
}
