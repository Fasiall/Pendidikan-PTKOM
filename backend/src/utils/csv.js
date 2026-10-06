/* ==========================================================================
   src/utils/csv.js - Pembuat string CSV sederhana (tanpa dependensi)

   Dipakai misalnya untuk mengekspor riwayat skor kuis:
     const csv = toCsv(rows, [
       { header: "ID", value: (r) => r.id },
       { header: "Nama", value: (r) => r.student_name }
     ]);
   ========================================================================== */

/** Escape satu sel sesuai aturan CSV (RFC 4180 sederhana). */
function escapeCell(value) {
  if (value === undefined || value === null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

/**
 * Ubah array objek menjadi string CSV.
 * columns: [{ header: string, value: (row) => any }]
 */
function toCsv(rows, columns) {
  const header = columns.map((col) => escapeCell(col.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCell(col.value(row))).join(",")
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

module.exports = { toCsv, escapeCell };
