// ESM resolve hook: maps "@/..." imports to src/....ts for Node scripts.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC_ROOT = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = specifier.slice(2);
    const candidates = [`${base}.ts`, `${base}/index.ts`, base];
    for (const candidate of candidates) {
      const url = new URL(candidate, SRC_ROOT);
      if (existsSync(fileURLToPath(url))) {
        return { url: url.href, shortCircuit: true, format: "module-typescript" };
      }
    }
  }
  return next(specifier, context);
}
