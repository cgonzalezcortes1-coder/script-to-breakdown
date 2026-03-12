import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip accents and replace ñ → n so Helvetica can render the text. */
const toAscii = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')                          // decompose é → e + combining acute
    .replace(/[\u0300-\u036f]/g, '')           // drop combining marks
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')    // ñ not caught by NFD
    .replace(/[^\x00-\x7F]/g, '?');           // any remaining non-ASCII → ?
};

/** Parse a hex color string like '#F5A623' into pdf-lib rgb(). */
const hexToRgb = (hex) => rgb(
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
);

/**
 * Simple greedy word-wrapper.
 * Returns up to maxLines lines that fit within maxWidth PDF points.
 */
const wrapText = (text, font, size, maxWidth, maxLines = 3) => {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      if (lines.length >= maxLines) return lines;
      current = word;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
};

// ── Main export function ───────────────────────────────────────────────────

/**
 * Draws annotation rectangles + labels onto a copy of the PDF, then downloads it.
 * @param {string}   pdfUrl       Firebase Storage URL of the original PDF
 * @param {Array}    annotations  Chapter annotations (already filtered by chapterId)
 * @param {string}   chapterTitle Used for the downloaded filename
 * @param {Function} onProgress   Optional callback(0–100) for a loading indicator
 */
export async function exportAnnotatedPdf(pdfUrl, annotations, chapterTitle, onProgress) {
  onProgress?.(5);

  // Fetch original PDF
  const sourceBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());
  onProgress?.(30);

  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages  = pdfDoc.getPages();
  onProgress?.(40);

  const total = annotations.length || 1;
  annotations.forEach((ann, annIdx) => {
    const col = hexToRgb(ann.color);

    for (const area of (ann.highlightAreas || [])) {
      const page = pages[area.pageIndex];
      if (!page) continue;

      const { width: pw, height: ph } = page.getSize();

      // PDF origin is bottom-left; our percentages are top-left.
      const x  = (area.left   / 100) * pw;
      const rw = (area.width  / 100) * pw;
      const rh = (area.height / 100) * ph;
      const y  = ph - ((area.top / 100) * ph) - rh;   // flip Y

      // ① Translucent filled rectangle + coloured border
      page.drawRectangle({
        x, y, width: rw, height: rh,
        color: col, opacity: 0.25,
        borderColor: col, borderWidth: 1.5, borderOpacity: 0.8,
      });

      // ② Label strip at top of rect: "FOLEY · Esc 3"
      const labelParts = [toAscii(ann.department)];
      if (ann.scene) labelParts.push(`Esc ${toAscii(ann.scene)}`);
      const labelText = labelParts.join(' · ');
      const lSize     = Math.max(6, Math.min(8, rw / 10));
      const lH        = lSize + 5;
      const lW        = Math.min(rw, font.widthOfTextAtSize(labelText, lSize) + 8);

      if (rh > lH + 4) {
        page.drawRectangle({ x, y: y + rh - lH, width: lW, height: lH, color: col, opacity: 0.88 });
        page.drawText(labelText, {
          x: x + 4, y: y + rh - lH + 2.5,
          size: lSize, font, color: rgb(1, 1, 1), opacity: 1,
        });
      }

      // ③ Note text (multi-line) inside rect, below label
      if (ann.note && rh > lH + 14) {
        const noteText  = toAscii(ann.note);
        const nSize     = Math.max(5.5, Math.min(7, rw / 12));
        const lineH     = nSize + 3.5;
        const lines     = wrapText(noteText, font, nSize, rw - 8);

        lines.forEach((line, i) => {
          const lineY = y + rh - lH - (i + 1) * lineH - 1;
          if (lineY > y + 3) {
            page.drawText(line, {
              x: x + 4, y: lineY,
              size: nSize, font, color: col, opacity: 0.85,
            });
          }
        });
      }
    }

    onProgress?.(40 + Math.round((annIdx + 1) / total * 55));
  });

  // Save & download
  const modifiedBytes = await pdfDoc.save();
  onProgress?.(98);

  const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  const slug = chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  a.download = `hasan-breakdown-${slug}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  onProgress?.(100);
}
