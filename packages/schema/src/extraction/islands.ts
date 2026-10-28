import { z } from "zod";

const source = z.strictObject({
  gameVersion: z.string().min(1),
  dataRevision: z.number().int().nonnegative(),
  resourceRevision: z.number().int().nonnegative(),
  manifestId: z.string().min(1),
});
const path = z
  .string()
  .min(1)
  .refine(
    (value) => !value.includes("\\") && !value.startsWith("/") && !value.split("/").includes(".."),
  );
const status = z.enum(["default", "encounter", "test", "placeholder", "unconfirmed"]);

const island = z.strictObject({
  id: z.number().int().positive(),
  nameZh: z.string().min(1),
  sceneId: z.number().int().positive(),
  status,
  galaxyId: z.number().int().positive().nullable(),
  regionId: z.number().int().positive().nullable(),
  iconStyleId: z.number().int().positive(),
  illustrationPath: path.nullable(),
  displayCreatureIds: z.number().int().positive().array(),
  displaySpecialtyIds: z.number().int().positive().array(),
});

const islandIconStyle = z.strictObject({
  id: z.number().int().positive(),
  nameZh: z.string().min(1),
  iconPath: path,
  variantIconPath: path,
  entityPrefabPath: path,
});

const region = z.strictObject({
  id: z.number().int().positive(),
  galaxyId: z.number().int().positive(),
  layerId: z.number().int().positive(),
  nameZh: z.string().min(1),
  sceneId: z.number().int().positive(),
  sdfPath: path,
  stationImagePath: path,
});

export const IslandDatabaseSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source,
    islands: island.array(),
    islandIconStyles: islandIconStyle.array(),
    regions: region.array(),
  })
  .superRefine((database, ctx) => {
    const sortedUnique = (values: number[], pathValue: string) => {
      for (let i = 1; i < values.length; i++)
        if (values[i - 1]! >= values[i]!)
          ctx.addIssue({
            code: "custom",
            path: [pathValue, i],
            message: "Values must be sorted and unique",
          });
    };
    sortedUnique(
      database.islands.map((value) => value.id),
      "islands",
    );
    sortedUnique(
      database.islandIconStyles.map((value) => value.id),
      "islandIconStyles",
    );
    sortedUnique(
      database.regions.map((value) => value.id),
      "regions",
    );
    const styles = new Set(database.islandIconStyles.map((value) => value.id));
    const regions = new Set(database.regions.map((value) => value.id));
    database.islands.forEach((value, index) => {
      for (const field of ["displayCreatureIds", "displaySpecialtyIds"] as const) {
        const ids = value[field];
        for (let i = 1; i < ids.length; i++)
          if (ids[i - 1]! >= ids[i]!)
            ctx.addIssue({
              code: "custom",
              path: ["islands", index, field],
              message: "IDs must be sorted and unique",
            });
      }
      if (!styles.has(value.iconStyleId))
        ctx.addIssue({
          code: "custom",
          path: ["islands", index, "iconStyleId"],
          message: "Unknown island icon style",
        });
      if (value.regionId !== null && !regions.has(value.regionId))
        ctx.addIssue({
          code: "custom",
          path: ["islands", index, "regionId"],
          message: "Unknown island region",
        });
    });
  });

export type IslandDatabase = z.infer<typeof IslandDatabaseSchema>;
export type Island = IslandDatabase["islands"][number];
export type IslandIconStyle = IslandDatabase["islandIconStyles"][number];
export type IslandRegion = IslandDatabase["regions"][number];

export function parseIslandDatabase(input: unknown): IslandDatabase {
  return IslandDatabaseSchema.parse(input);
}

export function islandImagePaths(database: IslandDatabase): string[] {
  return [
    ...new Set(
      [
        ...database.islands.map((island) => island.illustrationPath),
        ...database.islandIconStyles.flatMap((style) => [style.iconPath, style.variantIconPath]),
        ...database.regions.flatMap((region) => [region.sdfPath, region.stationImagePath]),
      ].filter((value): value is string => value !== null),
    ),
  ].sort();
}

export function validateIslandCatalog(
  database: IslandDatabase,
  catalog: {
    source: { gameVersion: string; dataRevision: number; resourceRevision: number };
    items: readonly { id: number; category: string; kind: string }[];
  },
): void {
  for (const key of ["gameVersion", "dataRevision", "resourceRevision"] as const)
    if (database.source[key] !== catalog.source[key])
      throw new Error("Island database source does not match content.json");
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  for (const island of database.islands) {
    for (const id of island.displayCreatureIds) {
      const item = items.get(id);
      if (item?.kind !== "item" || item.category !== "creatures")
        throw new Error(`Unknown island creature ${id}`);
    }
    for (const id of island.displaySpecialtyIds)
      if (items.get(id)?.kind !== "item") throw new Error(`Unknown island specialty ${id}`);
  }
}

export function isPublicIsland(island: Island): boolean {
  return island.status === "default" || island.status === "encounter";
}
