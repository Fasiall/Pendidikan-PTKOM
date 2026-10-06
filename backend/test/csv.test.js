const test = require("node:test");
const assert = require("node:assert/strict");

const { toCsv, escapeCell } = require("../src/utils/csv");

test("escapeCell mengutip sel yang mengandung koma/kutip/baris baru", () => {
  assert.equal(escapeCell("biasa"), "biasa");
  assert.equal(escapeCell("a,b"), '"a,b"');
  assert.equal(escapeCell('dia berkata "hai"'), '"dia berkata ""hai"""');
  assert.equal(escapeCell(null), "");
  assert.equal(escapeCell(42), "42");
});

test("toCsv menghasilkan header lalu baris dengan CRLF", () => {
  const rows = [
    { id: 1, nama: "Andi, S.Pd", skor: 8 },
    { id: 2, nama: "Budi", skor: 10 }
  ];
  const csv = toCsv(rows, [
    { header: "ID", value: (r) => r.id },
    { header: "Nama", value: (r) => r.nama },
    { header: "Skor", value: (r) => r.skor }
  ]);

  const lines = csv.split("\r\n");
  assert.equal(lines[0], "ID,Nama,Skor");
  assert.equal(lines[1], '1,"Andi, S.Pd",8');
  assert.equal(lines[2], "2,Budi,10");
  assert.equal(lines[3], ""); // diakhiri CRLF
});
