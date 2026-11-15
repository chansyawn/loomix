export function recordLocation(record: { id: number }) {
  return {
    to: "/collections/records/$id" as const,
    params: { id: String(record.id) },
    search: {},
  };
}
