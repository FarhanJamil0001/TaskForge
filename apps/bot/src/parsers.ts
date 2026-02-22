const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export function parsePriority(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(urgent|critical|high)\b/.test(lower)) return 'high';
  if (/\b(low|minor)\b/.test(lower)) return 'low';
  return null;
}

export function parseDueDate(text: string): string | null {
  // "due 2026-02-25" or "by 2026-02-25"
  const isoMatch = text.match(/(?:due|by)\s+(\d{4}-\d{2}-\d{2})/i);
  if (isoMatch) return isoMatch[1];

  // "due Feb 25" or "by February 25"
  const namedMatch = text.match(
    /(?:due|by)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/i,
  );
  if (namedMatch) {
    const month = MONTHS[namedMatch[1].toLowerCase().substring(0, 3)];
    const day = namedMatch[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Standalone ISO date
  const standaloneIso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (standaloneIso) return standaloneIso[1];

  return null;
}
