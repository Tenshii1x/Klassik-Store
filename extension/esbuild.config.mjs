import { build, context } from "esbuild"

const watch = process.argv.includes("--watch")

const entries = {
  "build/popup": "popup/popup.ts",
  "build/content": "content/temu-scraper.ts",
  "build/main-world": "content/main-world.ts",
  "build/background": "background/service-worker.ts",
}

async function run() {
  for (const [out, entry] of Object.entries(entries)) {
    const config = {
      entryPoints: [entry],
      bundle: true,
      minify: !watch,
      sourcemap: watch,
      target: "chrome120",
      format: "iife",
      outfile: `${out}.js`,
      logLevel: "info",
    }
    if (watch) {
      const ctx = await context(config)
      await ctx.watch()
    } else {
      await build(config)
    }
  }
  if (!watch) console.log("Build complete")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
