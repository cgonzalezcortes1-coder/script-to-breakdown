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
 * Greedy word-wrapper with hard truncation for words that exceed maxWidth.
 * Returns up to maxLines lines that fit within maxWidth PDF points.
 */
const wrapText = (text, font, size, maxWidth, maxLines = 3) => {
  // Truncate a single word that is wider than maxWidth, adding '...' suffix.
  const truncateWord = (word) => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) return word;
    let safe = '';
    for (const ch of word) {
      if (font.widthOfTextAtSize(safe + ch + '...', size) > maxWidth) break;
      safe += ch;
    }
    return safe + '...';
  };

  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const safeWord = truncateWord(word);
    const test = current ? `${current} ${safeWord}` : safeWord;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      if (lines.length >= maxLines) return lines;
      current = safeWord;
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

      // ③ Note sticker — right margin → left margin → below rect (fallback)
      if (ann.note) {
        const noteText = toAscii(ann.note);
        const nSize    = 7;
        const lineH    = nSize + 3.5;
        const padX     = 5;
        const padY     = 4;
        const gap      = 5;   // space between rect edge and sticker
        const minW     = 55;  // minimum useful sticker width (points)

        // How much blank space is available in each margin?
        const rightAvail = pw - (x + rw) - gap - 4;
        const leftAvail  = x - gap - 4;

        // Pick placement: right → left → below
        let stickerX, stickerW, placeBelow = false, placeLeft = false;

        if (rightAvail >= minW) {
          // Right margin — never exceed page right edge
          stickerW = Math.min(rightAvail, 130, pw - (x + rw + gap) - 4);
          stickerX = x + rw + gap;
        } else if (leftAvail >= minW) {
          // Left margin — never go below x = 4
          stickerW = Math.min(leftAvail, 130, x - gap - 4);
          stickerX = x - gap - stickerW;
          placeLeft = true;
        } else {
          // No usable margin — fall back to below (or above) the rect
          // Width: at least as wide as the rect but never past the page right edge
          stickerW = Math.min(Math.max(rw, 140), pw - x - 4);
          stickerX = x;
          placeBelow = true;
        }

        // Ensure stickerW is at least 1 to avoid division issues
        stickerW = Math.max(stickerW, 20);

        const lines    = wrapText(noteText, font, nSize, stickerW - padX * 2, 5);
        const stickerH = lines.length * lineH + padY * 2;

        // ── Vertical position ──────────────────────────────────
        let stickerY;
        if (placeBelow) {
          // Prefer below the rect visually; flip above if not enough room
          stickerY = y - gap - stickerH;
          if (stickerY < 4) stickerY = y + rh + gap;
        } else {
          // Align sticker top with rect top
          stickerY = y + rh - stickerH;
        }
        // Final clamp: never outside the page regardless of placement
        stickerY = Math.max(4, Math.min(ph - stickerH - 4, stickerY));

        // ── White sticker box ──────────────────────────────────
        page.drawRectangle({
          x: stickerX, y: stickerY,
          width: stickerW, height: stickerH,
          color: rgb(1, 1, 1), opacity: 0.95,
          borderColor: col, borderWidth: 1.2, borderOpacity: 0.85,
        });

        // ── Connector line ─────────────────────────────────────
        if (placeBelow) {
          // Short vertical line from rect edge to sticker
          const cx = x + rw * 0.12;
          page.drawLine({
            start: { x: cx, y: stickerY < y ? y : y + rh },
            end:   { x: cx, y: stickerY < y ? stickerY + stickerH : stickerY },
            thickness: 0.8, color: col, opacity: 0.4,
          });
        } else {
          // Horizontal line from rect mid-height to sticker edge
          const cy = y + rh / 2;
          page.drawLine({
            start: { x: placeLeft ? x : x + rw,              y: cy },
            end:   { x: placeLeft ? stickerX + stickerW : stickerX, y: cy },
            thickness: 0.8, color: col, opacity: 0.4,
          });
        }

        // ── Note text lines ────────────────────────────────────
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: stickerX + padX,
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
