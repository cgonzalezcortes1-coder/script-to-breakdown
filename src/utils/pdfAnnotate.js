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

      // ③ Note sticker — white box just BELOW the rectangle (flips above if no room)
      if (ann.note) {
        const noteText = toAscii(ann.note);
        const nSize    = 7;
        const lineH    = nSize + 3.5;
        const padX     = 5;
        const padY     = 4;
        // Sticker is at least as wide as the rect, with a generous min so text breathes
        const stickerW = Math.max(rw, Math.min(pw - x, 140));
        const lines    = wrapText(noteText, font, nSize, stickerW - padX * 2, 4);
        const stickerH = lines.length * lineH + padY * 2;
        const gap      = 3; // points between rect bottom edge and sticker top edge

        // PDF Y goes UP from bottom. Rect bottom = y. "Below visually" = lower PDF Y.
        let stickerY = y - gap - stickerH;
        // If sticker would fall below the page, flip it ABOVE the rect instead.
        if (stickerY < 2) stickerY = y + rh + gap;

        // White background + coloured border
        page.drawRectangle({
          x, y: stickerY,
          width: stickerW, height: stickerH,
          color: rgb(1, 1, 1), opacity: 0.95,
          borderColor: col, borderWidth: 1.2, borderOpacity: 0.85,
        });

        // Thin connector line from rect edge to sticker
        const connX = x + Math.min(rw, stickerW) * 0.12;
        page.drawLine({
          start: { x: connX, y: stickerY < y ? y : y + rh },
          end:   { x: connX, y: stickerY < y ? stickerY + stickerH : stickerY },
          thickness: 0.8, color: col, opacity: 0.45,
        });

        // Note lines
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: x + padX,
            y: stickerY + stickerH - padY - (i + 1) * lineH + 2,
            size: nSize, font, color: col, opacity: 1,
          });
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
