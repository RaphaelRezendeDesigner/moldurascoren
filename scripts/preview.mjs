import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { handle } from "../netlify/lib/service.mjs";
const root = resolve("site"),
  dbPath = join(
    tmpdir(),
    `coren-preview-${createHash("sha256").update(root).digest("hex").slice(0, 10)}.json`,
  );
let db = {};
try {
  db = JSON.parse(await readFile(dbPath, "utf8"));
} catch {}
let writing = Promise.resolve();
const save = () => {
  writing = writing.then(() => writeFile(dbPath, JSON.stringify(db)));
  return writing;
};
const store = {
  async get(k) {
    return db[k] ?? null;
  },
  async setJSON(k, v, o = {}) {
    if (o.onlyIfNew && k in db) return { modified: false };
    db[k] = v;
    await save();
    return { modified: true };
  },
  async delete(k) {
    delete db[k];
    await save();
  },
  async *list({ prefix }) {
    yield {
      blobs: Object.keys(db)
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key })),
    };
  },
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};
const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/.netlify/functions/campaign")) {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 250000) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(c);
      }
      const response = await handle(
        new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers: req.headers,
          body: ["GET", "HEAD"].includes(req.method)
            ? undefined
            : Buffer.concat(chunks),
        }),
        store,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const path = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!path.startsWith(root + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    const content = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
  console.log(
    `Local: http://127.0.0.1:${server.address().port}\nPrévia local; contador e mural isolados da produção.`,
  ),
);
