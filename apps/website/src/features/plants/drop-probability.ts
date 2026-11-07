const percentage = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });

export function dropProbability(probability: number | null): string {
  if (probability === null) return "未知";
  if (probability > 0 && probability < 0.0001) return "<0.01%";
  return percentage.format(probability * 100) + "%";
}
