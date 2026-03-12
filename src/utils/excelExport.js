import * as XLSX from 'xlsx';

export function exportToExcel(annotations) {
  const data = annotations.map((a) => ({
    Ubicación: `Pág ${a.pageIndex + 1}${a.scene ? `, Esc ${a.scene}` : ''}`,
    Departamento: a.department,
    Etapa: a.phaseLabel || '',
    Comentario: a.note || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { width: 16 },
    { width: 14 },
    { width: 10 },
    { width: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Desglose Sonido');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `desglose-sonido-${date}.xlsx`);
}
