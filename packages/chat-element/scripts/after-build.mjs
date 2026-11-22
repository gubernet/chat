/**
 * After the bundle:
 * - the chat's stylesheet next to the element, with the fonts of the formulas
 *   it points to, and the element shown as a block: a page sets its height;
 * - without "use client", which the chat's files say for React servers: the
 *   element runs only in the browser, and bundlers warn about it.
 */
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const chatStyles = require.resolve("@gubernet/chat/styles.css");

await mkdir(dist, { recursive: true });
await writeFile(
	join(dist, "styles.css"),
	`gubernet-chat{display:block}\n${await readFile(chatStyles, "utf8")}`,
);
await cp(join(dirname(chatStyles), "fonts"), join(dist, "fonts"), { recursive: true });

const USE_CLIENT = /^(["'])use client\1;?/;

for (const name of await readdir(dist)) {
	if (!name.endsWith(".js")) {
		continue;
	}

	const path = join(dist, name);
	const code = await readFile(path, "utf8");

	if (USE_CLIENT.test(code)) {
		await writeFile(path, code.replace(USE_CLIENT, ""));
	}
}
