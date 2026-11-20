import { expect, test } from "vite-plus/test";
import { createNameMatcher } from "./name-search";

test("名称支持连续文本片段、大小写和全角归一化", () => {
  expect(createNameMatcher("  星屿 a２  ")("春日星屿 A2")).toBe(true);
  expect(createNameMatcher("２")("星屿 A2")).toBe(true);
  expect(createNameMatcher("星 A2")("星屿 A2")).toBe(false);
  expect(createNameMatcher("  ")("星屿 A2")).toBe(true);
});

test("名称支持连续全拼、首字母和末尾音节的前缀", () => {
  const name = "新鲜番茄虾仁";
  for (const term of ["fanqie", "FAN QIE", "ＦＱ", "fanq", "qiex", "fān qié"]) {
    expect(createNameMatcher(term)(name), term).toBe(true);
  }
  for (const term of ["f x", "ie", "fan1 qie2", "番qie"]) {
    expect(createNameMatcher(term)(name), term).toBe(false);
  }
  expect(createNameMatcher("chong q")("重庆")).toBe(true);
  expect(createNameMatcher("xing qiu a2")("星球 A2")).toBe(true);
});

test("带调 ü、无调 ü 和 v 等价", () => {
  for (const term of ["lǜdǎo", "lüdao", "lvdao"]) {
    expect(createNameMatcher(term)("绿岛"), term).toBe(true);
  }
});
