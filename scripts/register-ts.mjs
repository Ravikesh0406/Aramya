// Registers the TypeScript + "@" path-alias resolver used by the Node scripts.
// Usage: node --import ./scripts/register-ts.mjs scripts/db-migrate.ts

import { register } from "node:module";
register("./ts-resolver.mjs", import.meta.url);
