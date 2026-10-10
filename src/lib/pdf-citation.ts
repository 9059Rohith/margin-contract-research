export type PdfTextItem = { str: string; transform: number[] };
export type ItemRange = { index: number; start: number; end: number; sourceStart: number };

/** Repeat the PDF extractor's visual reading order to map stored offsets to PDF.js text items. */
export function mapPdfPageItems(items: PdfTextItem[], expectedText: string): ItemRange[] | null {
  const ordered = items.map((item, index) => ({ item, index, x: item.transform[4] ?? 0, y: item.transform[5] ?? 0 }))
    .sort((a, b) => Math.abs(a.y - b.y) > 3 ? b.y - a.y : a.x - b.x);
  const lines: { y: number; text: string; pieces: { index: number; start: number; end: number }[] }[] = [];
  for (const entry of ordered) {
    let line = lines.at(-1);
    if (!line || Math.abs(line.y - entry.y) >= 3) {
      line = { y: entry.y, text: '', pieces: [] };
      lines.push(line);
    }
    if (line.text && !line.text.endsWith(' ')) line.text += ' ';
    const start = line.text.length;
    line.text += entry.item.str;
    line.pieces.push({ index: entry.index, start, end: line.text.length });
  }
  const ranges: ItemRange[] = [];
  const output: string[] = [];
  let offset = 0;
  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed) continue;
    if (output.length) offset++;
    const leading = line.text.length - line.text.trimStart().length;
    const trailing = leading + trimmed.length;
    for (const piece of line.pieces) {
      const start = Math.max(leading, piece.start);
      const end = Math.min(trailing, piece.end);
      if (start >= end) continue;
      ranges.push({
        index: piece.index,
        start: offset + line.text.slice(leading, start).normalize('NFC').length,
        end: offset + line.text.slice(leading, end).normalize('NFC').length,
        sourceStart: start - piece.start,
      });
    }
    output.push(trimmed.normalize('NFC'));
    offset += trimmed.normalize('NFC').length;
  }
  return output.join('\n') === expectedText ? ranges : null;
}
