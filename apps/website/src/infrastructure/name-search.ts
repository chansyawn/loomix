import { match } from "pinyin-pro";

export function createNameMatcher(keyword: string): (name: string) => boolean {
  const term = keyword.trim().normalize("NFKC").toLowerCase();
  if (!term) return () => true;

  const pinyin = term
    .normalize("NFD")
    .replaceAll("u\u0308", "v")
    .replace(/\p{Mark}|\s/gu, "");
  const searchByPinyin = /^[a-z0-9]+$/.test(pinyin) && /[a-z]/.test(pinyin);

  return (name) => {
    const text = name.normalize("NFKC").toLowerCase();
    return (
      text.includes(term) ||
      (searchByPinyin &&
        /\p{Script=Han}/u.test(text) &&
        match(text, pinyin, {
          continuous: true,
          precision: "first",
          lastPrecision: "start",
          v: true,
        }) !== null)
    );
  };
}
