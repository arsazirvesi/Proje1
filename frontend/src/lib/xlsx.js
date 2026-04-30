import * as XLSX from "xlsx";

/**
 * Export rows to a real .xlsx file with proper column widths and styling.
 *
 * @param {Array<Array<any>>} rows - First row is headers, the rest are data rows.
 * @param {string} filename - Output filename without extension.
 * @param {string} sheetName - Worksheet name (default: "Liste").
 */
export function exportXLSX(rows, filename = "liste", sheetName = "Liste") {
  if (!rows || rows.length === 0) return;

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns based on content (max 60 chars)
  const colWidths = rows[0].map((_, colIdx) => {
    const maxLen = rows.reduce((acc, row) => {
      const cell = row[colIdx];
      const len = cell == null ? 0 : String(cell).length;
      return Math.max(acc, len);
    }, 0);
    return { wch: Math.min(60, Math.max(8, maxLen + 2)) };
  });
  ws["!cols"] = colWidths;

  // Make header row bold
  const headerRange = XLSX.utils.decode_range(ws["!ref"]);
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write with .xlsx extension
  XLSX.writeFile(wb, `${filename}.xlsx`, { compression: true });
}
