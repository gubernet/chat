/**
 * The element's stylesheet in this package too, with the fonts it points to:
 * an app imports it from the package it installed.
 */
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const elementStyles = require.resolve("@gubernet/chat-element/styles.css");

await mkdir(dist, { recursive: true });
await cp(elementStyles, join(dist, "styles.css"));
await cp(join(dirname(elementStyles), "fonts"), join(dist, "fonts"), { recursive: true });
