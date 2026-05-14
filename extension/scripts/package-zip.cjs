/**
 * Package the built extension as a ZIP that the user can download from /admin and
 * load into Chrome via "Load unpacked" (after unzipping).
 *
 * Output: ../public/extension/klassik-importador.zip
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const root = path.resolve(__dirname, "..")
const out = path.resolve(root, "..", "public", "extension", "klassik-importador.zip")

// Ensure output dir exists
fs.mkdirSync(path.dirname(out), { recursive: true })

// Remove existing zip
if (fs.existsSync(out)) fs.unlinkSync(out)

// Files to include (relative to extension/ root)
const files = [
  "manifest.json",
  "build/background.js",
  "build/content.js",
  "build/main-world.js",
  "build/popup.js",
  "icons/16.png",
  "icons/48.png",
  "icons/128.png",
  "popup/popup.html",
  "popup/popup.css",
]

// Build the zip using `zip` CLI (available on Git Bash + Linux). Falls back to error.
try {
  const arg = files.join(" ")
  execSync(`zip -r "${out}" ${arg}`, { cwd: root, stdio: "inherit" })
  const stats = fs.statSync(out)
  console.log(`\nPackaged: ${out} (${stats.size} bytes)`)
} catch (e) {
  console.error("\nFailed to create ZIP. Make sure 'zip' is available in your PATH.")
  console.error("On Windows with Git Bash, this should work. On other platforms, install zip.")
  process.exit(1)
}
