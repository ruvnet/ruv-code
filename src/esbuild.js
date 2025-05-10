const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

function copyDir(srcDir, dstDir, count) {
	const entries = fs.readdirSync(srcDir, { withFileTypes: true })

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name)
		const dstPath = path.join(dstDir, entry.name)

		if (entry.isDirectory()) {
			fs.mkdirSync(dstPath, { recursive: true })
			count = copyDir(srcPath, dstPath, count)
		} else {
			count = count + 1
			fs.copyFileSync(srcPath, dstPath)
		}
	}

	return count
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
		})
	},
}

/**
 * @type {import('esbuild').Plugin}
 */
const copyWasmFiles = {
	name: "copy-wasm-files",
	setup(build) {
		build.onEnd(() => {
			const nodeModulesDir = path.join(__dirname, "node_modules")
			const distDir = path.join(__dirname, "dist")

			fs.mkdirSync(distDir, { recursive: true })

			// Tiktoken WASM file.
			fs.copyFileSync(
				path.join(nodeModulesDir, "tiktoken", "tiktoken_bg.wasm"),
				path.join(distDir, "tiktoken_bg.wasm"),
			)

			console.log(`[copy-wasm-files] Copied tiktoken_bg.wasm to ${distDir}`)

			// Main tree-sitter WASM file.
			fs.copyFileSync(
				path.join(nodeModulesDir, "web-tree-sitter", "tree-sitter.wasm"),
				path.join(distDir, "tree-sitter.wasm"),
			)

			console.log(`[copy-wasm-files] Copied tree-sitter.wasm to ${distDir}`)

			// Copy language-specific WASM files.
			const languageWasmDir = path.join(__dirname, "node_modules", "tree-sitter-wasms", "out")

			if (!fs.existsSync(languageWasmDir)) {
				throw new Error(`Directory does not exist: ${languageWasmDir}`)
			}

			// Dynamically read all WASM files from the directory instead of using a hardcoded list.
			const wasmFiles = fs.readdirSync(languageWasmDir).filter((file) => file.endsWith(".wasm"))

			wasmFiles.forEach((filename) => {
				fs.copyFileSync(path.join(languageWasmDir, filename), path.join(distDir, filename))
			})

			console.log(`[copy-wasm-files] Copied ${wasmFiles.length} tree-sitter language wasms to ${distDir}`)
		})
	},
}

function copyLocaleFiles() {
	const srcDir = path.join(__dirname, "i18n", "locales")
	const destDir = path.join(path.join(__dirname, "dist"), "i18n", "locales")

	if (!fs.existsSync(srcDir)) {
		throw new Error(`Directory does not exist: ${srcDir}`)
	}

	fs.mkdirSync(destDir, { recursive: true })
	const count = copyDir(srcDir, destDir, 0)
	console.log(`[copy-locales-files] Copied ${count} locale files to ${destDir}`)
}

function setupLocaleWatcher() {
	if (!watch) {
		return
	}

	const localesDir = path.join(__dirname, "src", "i18n", "locales")

	if (!fs.existsSync(localesDir)) {
		console.warn(`Cannot set up watcher: Source locales directory does not exist: ${localesDir}`)
		return
	}

	console.log(`Setting up watcher for locale files in ${localesDir}`)

	let debounceTimer = null

	const debouncedCopy = () => {
		if (debounceTimer) {
			clearTimeout(debounceTimer)
		}

		// Wait 300ms after last change before copying.
		debounceTimer = setTimeout(() => {
			console.log("Locale files changed, copying...")
			copyLocaleFiles()
		}, 300)
	}

	try {
		fs.watch(localesDir, { recursive: true }, (eventType, filename) => {
			if (filename && filename.endsWith(".json")) {
				console.log(`Locale file ${filename} changed, triggering copy...`)
				debouncedCopy()
			}
		})
		console.log("Watcher for locale files is set up")
	} catch (error) {
		console.error(`Error setting up watcher for ${localesDir}:`, error.message)
	}
}

/**
 * @type {import('esbuild').Plugin}
 */
const copyLocalesFiles = {
	name: "copy-locales-files",
	setup(build) {
		build.onEnd(() => copyLocaleFiles())
	},
}

/**
 * @type {import('esbuild').Plugin}
 */
const copyAssets = {
	name: "copy-assets",
	setup(build) {
		build.onEnd(() => {
			const copyPaths = [["node_modules/vscode-material-icons/generated", "assets/vscode-material-icons"]]

			for (const [srcRelPath, dstRelPath] of copyPaths) {
				const srcDir = path.join(__dirname, srcRelPath)
				const dstDir = path.join(__dirname, dstRelPath)

				if (!fs.existsSync(srcDir)) {
					throw new Error(`Directory does not exist: ${srcDir}`)
				}

				if (fs.existsSync(dstDir)) {
					fs.rmSync(dstDir, { recursive: true })
				}

				fs.mkdirSync(dstDir, { recursive: true })
				const count = copyDir(srcDir, dstDir, 0)
				console.log(`[copy-assets] Copied ${count} assets from ${srcDir} to ${dstDir}`)
			}
		})
	},
}

/**
 * @type {import('esbuild').BuildOptions}
 */
const extensionConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	plugins: [
		copyWasmFiles,
		copyLocalesFiles,
		copyAssets,
		esbuildProblemMatcherPlugin,
		{
			name: "alias-plugin",
			setup(build) {
				build.onResolve({ filter: /^pkce-challenge$/ }, (_args) => ({
					path: require.resolve("pkce-challenge/dist/index.browser.js"),
				}))
			},
		},
	],
	entryPoints: ["extension.ts"],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	outfile: "dist/extension.js",
	external: ["vscode"],
}

/**
 * @type {import('esbuild').BuildOptions}
 */
const workerConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	entryPoints: ["workers/countTokens.ts"],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	outdir: "dist/workers",
}

async function main() {
	const [extensionCtx, workerCtx] = await Promise.all([
		esbuild.context(extensionConfig),
		esbuild.context(workerConfig),
	])

	if (watch) {
		await Promise.all([extensionCtx.watch(), workerCtx.watch()])
		copyLocaleFiles()
		setupLocaleWatcher()
	} else {
		await Promise.all([extensionCtx.rebuild(), workerCtx.rebuild()])
		await Promise.all([extensionCtx.dispose(), workerCtx.dispose()])
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
