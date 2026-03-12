import * as XLSX from 'xlsx';

export function exportToExcel(annotations, chapterTitle = 'desglose') {
  const data = annotations.map((a) => ({
    Ubicación:    `Pág ${a.pageIndex + 1}${a.scene ? `, Esc ${a.scene}` : ''}`,
    Departamento: a.department,
    Etapa:        a.phaseLabel || '',
    Comentario:   a.note || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { width: 16 },
    { width: 14 },
    { width: 10 },
    { width: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Desglose Sonido');

  const date  = new Date().toISOString().split('T')[0];
  const slug  = chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  XLSX.writeFile(wb, `hasan-breakdown-${slug}-${date}.xlsx`);
}
