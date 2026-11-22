import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.ts" },
	outDir: "dist",
	format: "esm",
	target: "es2022",
	platform: "browser",
	// React and the chat inside: a page without a build loads this file and nothing else
	noExternal: [/.*/],
	// The PDF view loads only when a PDF opens
	splitting: true,
	minify: true,
	// Without maps: they would weigh twice the code, which is the chat's and has its own
	sourcemap: false,
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	// The declarations come from tsc: see tsconfig.build.json
	dts: false,
	// The stylesheet comes apart, by scripts/after-build.mjs
	clean: false,
});
