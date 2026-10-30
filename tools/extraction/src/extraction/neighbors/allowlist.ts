// IDs define admission; names document and validate the frozen roster.
export const neighborAllowlist = [
  { id: 11, name: "蛮蛮" },
  { id: 12, name: "绵朵莉" },
  { id: 1005, name: "幻雪" },
  { id: 1008, name: "热贝尔" },
  { id: 1009, name: "伊佐奇" },
  { id: 1010, name: "云果" },
  { id: 1011, name: "多杰朗" },
  { id: 1013, name: "萨飞里" },
  { id: 1015, name: "纳蕾娜" },
  { id: 1017, name: "哈佩诺" },
  { id: 1018, name: "缇卡" },
  { id: 1019, name: "鹤玉" },
] as const;

export function isAllowedNeighbor(id: number): boolean {
  return neighborAllowlist.some((neighbor) => neighbor.id === id);
}
