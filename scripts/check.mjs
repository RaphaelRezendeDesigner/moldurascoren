import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
for (const file of [
  "site/app.js",
  "api/campaign.js",
  "lib/service.mjs",
  "lib/vercel-store.mjs",
])
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
for (const file of [
  "site/index.html",
  "site/style.css",
  "site/assets/moldura-unica-azul-v2.png",
  "site/assets/propostas-chapa-2.pdf",
  "site/assets/propostas-chapa-1.pdf",
])
  await access(file);
console.log(
  "Site e funções validados. Publicação: site/ + api/.",
);
