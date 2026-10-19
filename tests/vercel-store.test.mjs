import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../lib/vercel-store.mjs";
import { handle } from "../lib/service.mjs";
import { randomUUID } from "node:crypto";
function fakeSDK() {
  const entries = new Map();
  return {
    entries,
    async put(path, body, options) {
      assert.equal(options.access, "private");
      assert.equal(options.addRandomSuffix, false);
      if (entries.has(path) && !options.allowOverwrite)
        throw new Error("already exists");
      entries.set(path, body);
    },
    async get(path, options) {
      assert.equal(options.access, "private");
      assert.equal(options.useCache, false);
      return entries.has(path)
        ? { statusCode: 200, stream: new Response(entries.get(path)).body }
        : null;
    },
    async del(path) {
      entries.delete(path);
    },
    async list({ prefix, cursor }) {
      const paths = [...entries.keys()]
        .filter((p) => p.startsWith(prefix))
        .sort();
      const start = Number(cursor || 0),
        end = start + 3;
      return {
        blobs: paths.slice(start, end).map((pathname) => ({ pathname })),
        hasMore: end < paths.length,
        cursor: String(end),
      };
    },
  };
}
const req = (method = "GET", body) =>
  new Request("https://example.vercel.app/api/campaign", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
test("Vercel adapter preserves conditional creation, private access and pagination", async () => {
  const sdk = fakeSDK(),
    store = createStore(sdk, "test/");
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      store.setJSON("item", { value: 1 }, { onlyIfNew: true }),
    ),
  );
  assert.equal(results.filter((r) => r.modified).length, 1);
  assert.deepEqual(await store.get("item"), { value: 1 });
  for (let i = 0; i < 7; i++) await store.setJSON(`events/${i}`, { i });
  const keys = [];
  for await (const page of store.list({ prefix: "events/" }))
    keys.push(...page.blobs);
  assert.equal(keys.length, 7);
  assert.equal(keys[0].key, "events/0");
  await store.delete("item");
  assert.equal(await store.get("item"), null);
});
test("complete campaign workflow through Vercel storage adapter", async () => {
  const store = createStore(fakeSDK(), "test/");
  const p = {
    id: randomUUID(),
    deleteToken: randomUUID() + randomUUID(),
    frame: "duas-chapas",
    thumbnail: "data:image/jpeg;base64,/9j/2Q==",
  };
  assert.equal((await handle(req("POST", p), store)).status, 200);
  assert.equal((await handle(req("POST", p), store)).status, 200);
  let state = await (await handle(req(), store)).json();
  assert.equal(state.total, 1);
  assert.equal(state.supporters.length, 1);
  await handle(req("DELETE", { id: p.id, token: p.deleteToken }), store);
  state = await (await handle(req(), store)).json();
  assert.equal(state.total, 1);
  assert.equal(state.supporters.length, 0);
});
test("unknown storage failures are not reported as successful writes", async () => {
  const sdk = fakeSDK();
  sdk.put = async () => {
    throw new Error("Unavailable");
  };
  await assert.rejects(
    createStore(sdk).setJSON("new", {}, { onlyIfNew: true }),
    /Unavailable/,
  );
});
test("missing storage configuration returns explicit setup failure", async () => {
  const { default: entry } = await import("../api/campaign.js");
  const response = await entry.fetch(req());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Vercel Blob privado/);
});
