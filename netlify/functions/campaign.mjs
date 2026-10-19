import { getStore } from "@netlify/blobs";
import { handle } from "../lib/service.mjs";
export default async function (request) {
  return handle(
    request,
    getStore({ name: "coren-am-campanha-2026", consistency: "strong" }),
    { adminToken: process.env.MURAL_ADMIN_TOKEN || "" },
  );
}
export const config = {
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
