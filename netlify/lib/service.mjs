import { createHash, timingSafeEqual } from "node:crypto";
const frames = new Set(["chapa-2", "chapa-1", "duas-chapas"]),
  uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digest = (s) => createHash("sha256").update(s).digest("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
async function keys(store, prefix) {
  const result = [];
  for await (const page of store.list({ prefix, paginate: true })) {
    result.push(...page.blobs.map((b) => b.key));
  }
  return result;
}
export async function handle(request, store, { adminToken = "" } = {}) {
  try {
    const url = new URL(request.url),
      origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      return json({ error: "Origem não permitida." }, 403);
    if (request.method === "GET") {
      const [downloads, wallKeys] = await Promise.all([
        keys(store, "downloads/"),
        keys(store, "wall/"),
      ]);
      const entries = await Promise.all(
        wallKeys
          .sort()
          .slice(0, 36)
          .map((key) => store.get(key, { type: "json" })),
      );
      const supporters = entries
        .filter(Boolean)
        .map(({ id, frame, thumbnail }) => ({ id, frame, thumbnail }));
      const counts = Object.fromEntries(
        [...frames].map((f) => [
          f,
          downloads.filter((k) => k.startsWith(`downloads/${f}/`)).length,
        ]),
      );
      return json({ total: downloads.length, counts, supporters });
    }
    if (!["POST", "DELETE"].includes(request.method))
      return json({ error: "Método não permitido." }, 405);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Envie JSON." }, 415);
    if (Number(request.headers.get("content-length")) > 250000)
      return json({ error: "Arquivo muito grande." }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Corpo ausente." }, 400);
    const chunks = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 250000) {
        await reader.cancel();
        return json({ error: "Arquivo muito grande." }, 413);
      }
      chunks.push(value);
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }
    if (!body || !uuid.test(body.id))
      return json({ error: "Identificador inválido." }, 400);
    const recordKey = `records/${body.id}`;
    if (request.method === "DELETE") {
      const record = await store.get(recordKey, { type: "json" });
      if (!record) return json({ error: "Foto não encontrada." }, 404);
      const admin =
        adminToken &&
        equal(
          request.headers.get("authorization") || "",
          `Bearer ${adminToken}`,
        );
      if (
        !admin &&
        !(
          typeof body.token === "string" &&
          equal(digest(body.token), record.deleteHash)
        )
      )
        return json({ error: "Você não pode retirar essa foto." }, 403);
      await store.delete(record.wallKey);
      return json({ removed: true });
    }
    if (
      !frames.has(body.frame) ||
      typeof body.deleteToken !== "string" ||
      body.deleteToken.length < 60 ||
      body.deleteToken.length > 100
    )
      return json({ error: "Dados inválidos." }, 400);
    if (body.thumbnail !== null && body.thumbnail !== undefined) {
      if (
        typeof body.thumbnail !== "string" ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.thumbnail) ||
        body.thumbnail.length > 140000
      )
        return json({ error: "Miniatura inválida." }, 400);
      const bytes = Buffer.from(body.thumbnail.split(",")[1], "base64");
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
        return json({ error: "Imagem inválida." }, 400);
    }
    let record = await store.get(recordKey, { type: "json" });
    if (!record) {
      const created = {
        id: body.id,
        frame: body.frame,
        deleteHash: digest(body.deleteToken),
        wallKey: `wall/${String(9999999999999 - Date.now())}-${body.id}`,
      };
      await store.setJSON(recordKey, created, { onlyIfNew: true });
      record = await store.get(recordKey, { type: "json" });
    }
    if (
      !record ||
      record.frame !== body.frame ||
      !equal(record.deleteHash, digest(body.deleteToken))
    )
      return json({ error: "Identificador já utilizado." }, 409);
    await store.setJSON(
      `downloads/${body.frame}/${body.id}`,
      { createdAt: Date.now() },
      { onlyIfNew: true },
    );
    if (body.thumbnail)
      await store.setJSON(
        record.wallKey,
        { id: body.id, frame: body.frame, thumbnail: body.thumbnail },
        { onlyIfNew: true },
      );
    return json({
      ok: true,
      public: !!body.thumbnail || !!(await store.get(record.wallKey)),
    });
  } catch (e) {
    console.error("Campaign storage failure:", e.name);
    return json(
      { error: "Serviço temporariamente indisponível. Tente novamente." },
      503,
    );
  }
}
