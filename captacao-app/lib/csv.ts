export function parseCSV(texto: string): Record<string, string>[] {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (linhas.length < 2) return [];
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = linhas[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(sep);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = (cols[idx] ?? "").trim().replace(/^"|"$/g, "")));
    rows.push(row);
  }
  return rows;
}
export const num = (s: string) => Number(String(s ?? "").replace(/\s/g, "").replace(",", ".")) || 0;
export const data = (s: string): string | null => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
