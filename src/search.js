// One shared search implementation for the overlay and the full results page.
export function normalizeSearch(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/orthopa?edic|orthopedic|ortho\b/g, "orthopedic")
    .replace(/memoryfoam/g, "memory foam")
    .replace(/matress(?:es)?|mattresses/g, "mattress")
    .replace(/pillows/g, "pillow")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function closeWord(a, b) {
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
export function searchProducts(products, query = "") {
  const q = normalizeSearch(query);
  if (!q) return [...products];
  const terms = q.split(" ");
  return products
    .map((p) => {
      const mattress = !["Bedding", "Accessories"].includes(p.category);
      const fields = [
        normalizeSearch(p.name),
        normalizeSearch(p.category),
        normalizeSearch(p.material),
        normalizeSearch(
          [
            p.firmness,
            p.subtitle,
            mattress ? "mattress single double queen king" : "",
            p.specs?.cooling ? "cooling" : "",
          ].join(" "),
        ),
      ];
      const weights = [8, 6, 4, 2];
      let score = 0;
      for (const t of terms) {
        let best = 0;
        fields.forEach((text, i) => {
          if (text.includes(t)) best = Math.max(best, weights[i]);
          else if (text.split(" ").some((w) => closeWord(t, w)))
            best = Math.max(best, 1);
        });
        if (!best) return { p, score: 0 };
        score += best;
      }
      if (fields[0].includes(q)) score += 10;
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.p.stock - a.p.stock)
    .map((r) => r.p);
}
