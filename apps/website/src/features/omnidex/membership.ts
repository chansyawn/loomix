export function indexMembership<Group>(
  groups: readonly Group[],
  memberIds: (group: Group) => readonly number[] | null,
): Map<number, Group[]> {
  const index = new Map<number, Group[]>();
  for (const group of groups)
    for (const id of memberIds(group) ?? []) {
      const memberships = index.get(id);
      if (memberships) memberships.push(group);
      else index.set(id, [group]);
    }
  return index;
}
