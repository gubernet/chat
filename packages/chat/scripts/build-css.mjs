/**
 * Builds the stylesheets of the package:
 * - dist/styles.css, the whole chat, every rule under .gubernet-chat and out of
 *   the cascade layers, so the page's own styles neither reach the chat nor win
 *   over it;
 * - dist/vendor.css, only the formulas and the PDF text, for an app that
 *   compiles the chat's classes with its own Tailwind;
 * - dist/fonts, the fonts of the formulas both stylesheets point to.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const SCOPE = ".gubernet-chat";

// The page itself, in a stylesheet written for a whole page: here, the chat
const PAGE = /^(:root|:host|html|body)(?![\w-])/;

const scopeSelector = (selector) =>
	PAGE.test(selector) ? selector.replace(PAGE, SCOPE) : `${SCOPE} ${selector}`;

const scope = {
	postcssPlugin: "gubernet-scope",
	Once(css) {
		// Out of the layers: a page's rules outside any layer would win over all of them
		css.walkAtRules("layer", (layer) => {
			if (layer.nodes) {
				layer.replaceWith(layer.nodes);
			} else {
				layer.remove();
			}
		});

		css.walkRules((rule) => {
			// Only the outer rules: the nested ones follow them; keyframes have no selectors
			if (rule.parent.type === "rule" || rule.parent.name?.endsWith("keyframes")) {
				return;
			}

			rule.selectors = [...new Set(rule.selectors.map(scopeSelector))];
		});
	},
};

// The fonts go next to the stylesheets, wherever the build found them
const localFonts = {
	postcssPlugin: "gubernet-fonts",
	Declaration(declaration) {
		if (declaration.value.includes("KaTeX_")) {
			declaration.value = declaration.value.replace(
				/url\((["']?)[^)"']*?(KaTeX_[\w-]+\.\w+)\1\)/g,
				"url(./fonts/$2)",
			);
		}
	},
};

const katex = dirname(require.resolve("katex/package.json"));
const vendorFiles = [
	join(katex, "dist/katex.min.css"),
	require.resolve("react-pdf/dist/Page/TextLayer.css"),
];

await mkdir(dist, { recursive: true });

const entry = join(root, "src/styles/index.css");
const styles = await postcss([tailwindcss({ optimize: true }), scope, localFonts]).process(
	await readFile(entry, "utf8"),
	{ from: entry, to: join(dist, "styles.css") },
);

await writeFile(join(dist, "styles.css"), styles.css);

const vendor = await Promise.all(
	vendorFiles.map(async (file) => {
		const result = await postcss([localFonts]).process(await readFile(file, "utf8"), {
			from: file,
			to: join(dist, "vendor.css"),
		});

		return result.css;
	}),
);

await writeFile(join(dist, "vendor.css"), `${vendor.join("\n")}\n`);
await cp(join(katex, "dist/fonts"), join(dist, "fonts"), { recursive: true });
