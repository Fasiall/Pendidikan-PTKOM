const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError, asyncHandler } = require("../src/utils/errors");

test("ApiError membawa status HTTP dan pesan", () => {
  assert.equal(ApiError.badRequest("x").status, 400);
  assert.equal(ApiError.unauthorized().status, 401);
  assert.equal(ApiError.forbidden().status, 403);
  assert.equal(ApiError.notFound().status, 404);
});

test("asyncHandler meneruskan error ke next", async () => {
  const err = new Error("gagal");
  const handler = asyncHandler(async () => {
    throw err;
  });

  await new Promise((resolve) => {
    handler({}, {}, (e) => {
      assert.equal(e, err);
      resolve();
    });
  });
});
