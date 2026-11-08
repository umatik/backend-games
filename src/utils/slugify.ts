const SPECIAL_LETTERS: Record<string, string> = {
  ł: "l",
  Ł: "l",
  ø: "o",
  Ø: "o",
  ß: "ss",
  æ: "ae",
  Æ: "ae",
  đ: "d",
  Đ: "d",
};

export const slugify = (text: string, maxLength = 200): string =>
  text
    .replace(/[łŁøØßæÆđĐ]/g, (letter) => SPECIAL_LETTERS[letter] ?? letter)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
