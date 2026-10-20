const resourceBase = import.meta.env.VITE_RESOURCE_BASE_URL;

export function resourceUrl(path: string): string {
  return `${resourceBase}${path}`;
}
