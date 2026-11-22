export const vignetteTables = { gameplay: 288, rules: 290, display: 291 } as const;
export const vignetteAdmissionsFile = "vignette-admissions.json";

export const vignetteFields = {
  gameplay: {
    name: 1,
    discoveryKey: 2,
    footprint: 4,
    stars: 5,
    site: 6,
    requirements: 10,
    objectRule: 11,
    creature: 12,
    neighbor: 14,
    preview: 17,
  },
  display: { name: 1, image: 3, order: 4, ground: 5, labels: 6, requirements: 7, rules: 8 },
} as const;
