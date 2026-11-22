import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.ts" },
	outDir: "dist",
	format: "esm",
	target: "es2022",
	// Vue and the element stay outside: the app installs them
	sourcemap: true,
	// The declarations come from tsc: see tsconfig.build.json
	dts: false,
	// The stylesheet is copied apart, by scripts/copy-styles.mjs
	clean: false,
});
