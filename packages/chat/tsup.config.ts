import { defineConfig } from "tsup";

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
