/**
 * Generate placeholder gold-on-black KS icons for the Chrome extension.
 * Creates 16x16, 48x48, 128x128 PNGs with a simple gold circle and "KS" text approximation.
 *
 * Run: node scripts/make-icons.cjs
 */

const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

function crc32(buf) {
  let c
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, "ascii")
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

function makeIcon(size) {
  // Build RGBA pixel buffer: black background, gold circle, KS letters approximation
  const channels = 4
  const stride = size * channels + 1 // +1 for filter byte
  const raw = Buffer.alloc(stride * size, 0)

  const centerX = (size - 1) / 2
  const centerY = (size - 1) / 2
  const outerR = (size / 2) * 0.92
  const innerR = (size / 2) * 0.78
  const goldR = 0xc9
  const goldG = 0xa8
  const goldB = 0x6a

  for (let y = 0; y < size; y++) {
    const rowStart = y * stride
    raw[rowStart] = 0 // filter type none

    for (let x = 0; x < size; x++) {
      const i = rowStart + 1 + x * channels
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Default: opaque black
      raw[i] = 10
      raw[i + 1] = 10
      raw[i + 2] = 10
      raw[i + 3] = 255

      // Gold ring band
      if (dist >= innerR && dist <= outerR) {
        raw[i] = goldR
        raw[i + 1] = goldG
        raw[i + 2] = goldB
      }

      // Simple "KS" text approximation in the center (for icons >= 32px)
      if (size >= 32) {
        const cx = size / 2
        const cy = size / 2
        const tx = x - cx
        const ty = y - cy
        const textHalf = size * 0.22
        // K vertical bar
        if (tx >= -textHalf * 0.9 && tx <= -textHalf * 0.55 && Math.abs(ty) <= textHalf * 0.85) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
        // K upper diagonal
        if (tx >= -textHalf * 0.55 && tx <= 0 && Math.abs(ty + tx * 1.2) <= textHalf * 0.18) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
        // K lower diagonal
        if (tx >= -textHalf * 0.55 && tx <= 0 && Math.abs(ty - tx * 1.2) <= textHalf * 0.18) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
        // S curve (simple S-like shape from two arcs)
        const sx = tx - textHalf * 0.35
        const sy = ty
        const sdist1 = Math.sqrt(sx * sx + (sy + textHalf * 0.3) * (sy + textHalf * 0.3))
        const sdist2 = Math.sqrt(sx * sx + (sy - textHalf * 0.3) * (sy - textHalf * 0.3))
        const sBandIn = textHalf * 0.2
        const sBandOut = textHalf * 0.42
        if (sdist1 >= sBandIn && sdist1 <= sBandOut && sy <= textHalf * 0.1) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
        if (sdist2 >= sBandIn && sdist2 <= sBandOut && sy >= -textHalf * 0.1) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
      } else {
        // For 16px: just a smaller solid gold circle in center as "KS" stand-in
        const innerSolidR = size * 0.25
        if (dist <= innerSolidR) {
          raw[i] = goldR
          raw[i + 1] = goldG
          raw[i + 2] = goldB
        }
      }
    }
  }

  // Compress
  const idat = zlib.deflateSync(raw)
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk("IHDR", ihdrData), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
}

const sizes = [16, 48, 128]
const outDir = path.join(__dirname, "..", "icons")
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

for (const s of sizes) {
  const png = makeIcon(s)
  const file = path.join(outDir, `${s}.png`)
  fs.writeFileSync(file, png)
  console.log(`Wrote ${file} (${png.length} bytes)`)
}
console.log("Icons generated.")
