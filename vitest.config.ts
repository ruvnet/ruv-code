import { defineConfig } from "vitest/config"
import path from 'path'

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './webview-ui/src'),
			'@src': path.resolve(__dirname, './webview-ui/src'),
			'@roo': path.resolve(__dirname, './src')
		}
	},
	test: {
		include: [
			"**/__tests__/**/*.spec.ts",
			"**/__tests__/**/*.test.ts",
			"**/__tests__/**/*.test.tsx"
		],
		environment: 'jsdom',
		setupFiles: ['./webview-ui/src/test-setup.ts'],
		globals: true,
	},
})
