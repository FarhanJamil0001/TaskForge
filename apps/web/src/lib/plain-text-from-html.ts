/**
 * Plain text for compact UI previews when content may be HTML from the rich description editor.
 */
export function plainTextFromHtml(html: string): string {
  const raw = html.trim();
  if (!raw) return '';

  if (typeof document !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const text = doc.body.textContent ?? '';
      return collapseWhitespace(text);
    } catch {
      // fall through
    }
  }

  return collapseWhitespace(
    raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
