import * as blobSDK from "@vercel/blob";

// The store must be PRIVATE: records contain hashes used to authorize deletion.
// Only the sanitized gallery response is exposed by /api/campaign.
export function createStore(
  sdk = blobSDK,
  namespace = "coren-am-2026/production/",
) {
  const path = (key) => `${namespace}${key}.json`;
  async function read(key) {
    const result = await sdk.get(path(key), {
      access: "private",
      useCache: false,
    });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream)
      throw new Error("Unexpected Blob response");
    return new Response(result.stream).json();
  }
  return {
    get: read,
    async setJSON(key, value, { onlyIfNew = false } = {}) {
      try {
        await sdk.put(path(key), JSON.stringify(value), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: !onlyIfNew,
          contentType: "application/json",
          cacheControlMaxAge: 60,
        });
        return { modified: true };
      } catch (error) {
        // No get-then-overwrite race: storage rejects an existing pathname.
        // A lost response after a successful write is also safe to retry.
        if (onlyIfNew && (await read(key)) !== null) return { modified: false };
        throw error;
      }
    },
    async delete(key) {
      await sdk.del(path(key));
    },
    async *list({ prefix }) {
      let cursor;
      do {
        const result = await sdk.list({
          prefix: namespace + prefix,
          limit: 1000,
          ...(cursor ? { cursor } : {}),
        });
        yield {
          blobs: result.blobs
            .filter((b) => b.pathname.endsWith(".json"))
            .map((b) => ({ key: b.pathname.slice(namespace.length, -5) })),
        };
        cursor = result.hasMore ? result.cursor : undefined;
        if (result.hasMore && !cursor)
          throw new Error("Missing Blob pagination cursor");
      } while (cursor);
    },
  };
}
