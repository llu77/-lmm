import cloudflare from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		cloudflare({
			configPath: "./wrangler.toml",
		}),
		react(),
	],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: "./src/index.html",
			},
		},
	},
	server: {
		port: 5173,
		strictPort: true,
	},
});
