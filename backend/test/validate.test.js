const test = require("node:test");
const assert = require("node:assert/strict");

const { requireFields, toInt, toBool, sanitizeStudentName } = require("../src/utils/validate");
const { ApiError } = require("../src/utils/errors");

test("requireFields melempar error bila field wajib kosong", () => {
  assert.throws(() => requireFields({ nama: "  " }, ["nama"]), ApiError);
  assert.doesNotThrow(() => requireFields({ nama: "Andi" }, ["nama"]));
});

test("toInt hanya menerima bilangan bulat dalam rentang", () => {
  assert.equal(toInt("5", "n", { min: 1 }), 5);
  assert.throws(() => toInt("abc", "n"), ApiError);
  assert.throws(() => toInt(0, "n", { min: 1 }), ApiError);
  assert.throws(() => toInt(3.5, "n"), ApiError);
});

test("toBool menerima berbagai representasi", () => {
  assert.equal(toBool(true), true);
  assert.equal(toBool("yes"), true);
  assert.equal(toBool("0"), false);
  assert.equal(toBool(undefined, true), true);
});

test("sanitizeStudentName membersihkan dan membatasi panjang", () => {
  assert.equal(sanitizeStudentName("  Budi   Santoso "), "Budi Santoso");
  assert.equal(sanitizeStudentName(null), "");
  assert.equal(sanitizeStudentName(undefined), "");
  assert.equal(sanitizeStudentName("x".repeat(100)).length, 60);
});
