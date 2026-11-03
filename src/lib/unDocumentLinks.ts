/** Recognize explicit UN symbols and two unambiguous resolution references. */
export function unDocumentLinks(
  text: string,
): { text: string; href?: string }[] {
  const pattern =
    /\b(?:(General\s+Assembly|Security\s+Council)\s+resolution\s+(\d+\/\d+|\d+\s*\((?:[IVXLCDM]+|\d{4})\))|(?:A|S|E|ST|DP)\/(?:[A-Z][A-Z0-9.]*\/)*\d+(?:\/[A-Z0-9][A-Z0-9.]*)*(?:\([IVXLCDM0-9]+\))?)/gi;
  const parts: { text: string; href?: string }[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    // A final sentence period belongs to the prose, not the symbol.
    const label = match[0].replace(/\.+$/, "");
    const symbol = match[1]
      ? `${/^General/i.test(match[1]) ? "A" : "S"}/RES/${match[2].replace(/\s/g, "").toUpperCase()}`
      : label
          .replace(/^[a-z]+/i, (prefix) => prefix.toUpperCase())
          .replace(/\/res\//i, "/RES/");
    if (start > end) parts.push({ text: text.slice(end, start) });
    parts.push({ text: label, href: `https://docs.un.org/${symbol}` });
    end = start + label.length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
}
