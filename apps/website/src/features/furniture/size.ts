export function furnitureSize(tagNames: readonly string[]): string | null {
  const sizes = [
    ...new Set(
      tagNames.flatMap((name) => {
        const match = /^尺寸_(\d+(?:a\d+)?)_(\d+(?:a\d+)?)$/.exec(name);
        return match
          ? [
              `${Number(match[1]!.replace("a", ".")).toFixed(1)}x${Number(match[2]!.replace("a", ".")).toFixed(1)}`,
            ]
          : [];
      }),
    ),
  ];
  return sizes.length === 1 ? sizes[0]! : null;
}
