/**
 * Plain text for compact UI previews when content may be HTML from the rich description editor.
 */
export function plainTextFromHtml(html: string): string {
  const raw = html.trim();
  if (!raw) return '';

  // Always strip tags with the same regex pipeline on server and client.
  // DOMParser + textContent differs from this (e.g. adjacent <p>/<li> nodes
  // often concatenate with no space), which caused React hydration mismatches
  // in components like EditableNotesCell.
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
