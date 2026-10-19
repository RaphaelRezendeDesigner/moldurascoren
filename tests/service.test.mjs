import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handle } from "../netlify/lib/service.mjs";
function memory() {
  const data = new Map();
  return {
    data,
    async get(k) {
      return data.get(k) ?? null;
    },
    async setJSON(k, v, { onlyIfNew } = {}) {
      if (onlyIfNew && data.has(k)) return { modified: false };
      data.set(k, v);
      return { modified: true };
    },
    async delete(k) {
      data.delete(k);
    },
    async *list({ prefix }) {
      const rows = [...data.keys()]
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key }));
      for (let i = 0; i < rows.length; i += 7)
        yield { blobs: rows.slice(i, i + 7) };
    },
  };
}
const payload = (extra = {}) => ({
  id: randomUUID(),
  frame: "chapa-2",
  deleteToken: randomUUID() + randomUUID(),
  thumbnail: null,
  ...extra,
});
const request = (method = "GET", body, headers = {}) =>
  new Request("https://example.netlify.app/.netlify/functions/campaign", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const jpeg = "data:image/jpeg;base64,/9j/2Q==";
test("concurrent downloads are counted once each, including retries", async () => {
  const store = memory(),
    p = payload();
  const batch = [p, p, p, ...Array.from({ length: 24 }, () => payload())];
  const results = await Promise.all(
    batch.map((x) => handle(request("POST", x), store)),
  );
  assert(results.every((r) => r.status === 200));
  const state = await (await handle(request(), store)).json();
  assert.equal(state.total, 25);
  assert.equal(state.counts["chapa-2"], 25);
  assert.deepEqual(state.supporters, []);
});
test("public gallery exposes no removal tokens and requires ownership for deletion", async () => {
  const store = memory(),
    p = payload({ thumbnail: jpeg });
  await handle(request("POST", p), store);
  let state = await (await handle(request(), store)).json();
  assert.equal(state.supporters.length, 1);
  assert.deepEqual(Object.keys(state.supporters[0]).sort(), [
    "frame",
    "id",
    "thumbnail",
  ]);
  assert.equal(
    (await handle(request("DELETE", { id: p.id, token: "wrong" }), store))
      .status,
    403,
  );
  assert.equal(
    (await handle(request("DELETE", { id: p.id, token: p.deleteToken }), store))
      .status,
    200,
  );
  state = await (await handle(request(), store)).json();
  assert.equal(state.total, 1);
  assert.equal(state.supporters.length, 0);
});
test("private download can become public without another count", async () => {
  const store = memory(),
    p = payload();
  await handle(request("POST", p), store);
  p.thumbnail = jpeg;
  await handle(request("POST", p), store);
  const state = await (await handle(request(), store)).json();
  assert.equal(state.total, 1);
  assert.equal(state.supporters.length, 1);
});
test("malformed, cross-origin and oversized requests cannot create records", async () => {
  const store = memory();
  for (const body of [
    null,
    payload({ frame: "bad" }),
    payload({ thumbnail: "data:text/html,<script>x</script>" }),
    payload({ deleteToken: "short" }),
  ])
    assert.equal((await handle(request("POST", body), store)).status, 400);
  assert.equal(
    (
      await handle(
        request("POST", payload(), { Origin: "https://other.example" }),
        store,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handle(
        request("POST", payload({ thumbnail: "x".repeat(260000) })),
        store,
      )
    ).status,
    413,
  );
  assert.equal(store.data.size, 0);
});
test("an existing id cannot be hijacked", async () => {
  const store = memory(),
    p = payload();
  await handle(request("POST", p), store);
  assert.equal(
    (
      await handle(
        request("POST", {
          ...p,
          deleteToken: randomUUID() + randomUUID(),
          thumbnail: jpeg,
        }),
        store,
      )
    ).status,
    409,
  );
});
test("partial write failure can be retried without duplicating count", async () => {
  const store = memory(),
    p = payload({ thumbnail: jpeg }),
    set = store.setJSON;
  let fail = true;
  store.setJSON = async (k, ...args) => {
    if (k.startsWith("wall/") && fail) {
      fail = false;
      throw new Error("transient");
    }
    return set(k, ...args);
  };
  assert.equal((await handle(request("POST", p), store)).status, 503);
  assert.equal((await handle(request("POST", p), store)).status, 200);
  const state = await (await handle(request(), store)).json();
  assert.equal(state.total, 1);
  assert.equal(state.supporters.length, 1);
});
test("administrator can remove a publication", async () => {
  const store = memory(),
    p = payload({ thumbnail: jpeg });
  await handle(request("POST", p), store);
  assert.equal(
    (
      await handle(
        request("DELETE", { id: p.id }, { Authorization: "Bearer admin-test" }),
        store,
        { adminToken: "admin-test" },
      )
    ).status,
    200,
  );
});
