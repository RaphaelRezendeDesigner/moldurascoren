import { handle } from "../lib/service.mjs";
import { createStore } from "../lib/vercel-store.mjs";

export default {
  async fetch(request) {
    if (
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
    ) {
      return Response.json(
        {
          error:
            "Conecte um Vercel Blob privado ao projeto e faça um novo deploy.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const environment =
      process.env.VERCEL_ENV === "production" ? "production" : "preview";
    const store = createStore(undefined, `coren-am-2026/${environment}/`);
    return handle(request, store, {
      adminToken: process.env.MURAL_ADMIN_TOKEN || "",
    });
  },
};
