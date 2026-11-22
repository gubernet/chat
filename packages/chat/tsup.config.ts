import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { defineConfig, type Options } from "tsup";

type EsbuildPlugin = NonNullable<Options["esbuildPlugins"]>[number];

const RAW = "?raw";

// A file imported with "?raw" is its text, as Vite gives it in the tests
const rawText: EsbuildPlugin = {
	name: "raw-text",
	setup(build) {
		// Found as Node finds it from the importing file: for esbuild, the packages stay outside
		build.onResolve({ filter: /\?raw$/ }, ({ path, importer }) => ({
			path: createRequire(importer).resolve(path.slice(0, -RAW.length)),
			namespace: "raw-text",
		}));
		build.onLoad({ filter: /.*/, namespace: "raw-text" }, async ({ path }) => ({
			contents: await readFile(path, "utf8"),
			loader: "text",
		}));
	},
};

const shared = {
	format: "esm",
	target: "es2022",
	// The declarations come from tsc: see tsconfig.build.json
	dts: false,
	sourcemap: true,
	// The stylesheet is built apart, by scripts/build-css.mjs
	clean: false,
} as const;

export default defineConfig([
	// The components: every file is for the browser
	{
		...shared,
		entry: { index: "src/index.ts" },
		outDir: "dist",
		// The PDF view loads only when a PDF opens
		splitting: true,
		// The models' logos are written into the code
		loader: { ".svg": "dataurl" },
		// The PDF worker too, in the chunk of the PDF view, though its package stays outside
		esbuildPlugins: [rawText],
		noExternal: [/\?raw$/],
		banner: { js: '"use client";' },
	},
	// The contract, without React and without "use client": a server imports it too.
	// Its code is also inside the components' build, which must not import a server file
	{
		...shared,
		entry: { index: "src/contract/index.ts" },
		outDir: "dist/contract",
	},
]);
