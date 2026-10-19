import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
for (const file of [
  "site/app.js",
  "netlify/functions/campaign.mjs",
  "netlify/lib/service.mjs",
])
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
for (const file of [
  "site/index.html",
  "site/style.css",
  "site/assets/chapa-2.png",
  "site/assets/chapa-1.png",
  "site/assets/duas-chapas.png",
  "site/assets/propostas-chapa-2.pdf",
  "site/assets/propostas-chapa-1.pdf",
])
  await access(file);
console.log(
  "Site e funções validados. Publicação: site/ + netlify/functions/.",
);
