import Jimp from 'jimp'
import fs from 'fs'
import path from 'path'

const outDir = path.resolve('frontend/public/icons')
fs.mkdirSync(outDir, { recursive: true })

async function createIcon(size, name) {
  const img = new Jimp(size, size, 0x00000000)
  const cx = size / 2, cy = size / 2
  const radius = size * 0.44

  // Draw gradient circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= radius) {
        const t = y / size
        const r = Math.round(12 + (18 - 12) * t)
        const g = Math.round(12 + (18 - 12) * t)
        const b = Math.round(20 + (30 - 20) * t)
        img.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y)
      }
    }
  }

  // Accent glow
  const gl = size * 0.3
  const gx = cx, gy = size * 0.4
  for (let y = Math.max(0, Math.round(gy - gl)); y <= Math.min(size - 1, Math.round(gy + gl)); y++) {
    for (let x = Math.max(0, Math.round(gx - gl)); x <= Math.min(size - 1, Math.round(gx + gl)); x++) {
      const d = Math.sqrt((x - gx) ** 2 + (y - gy) ** 2)
      if (d <= gl && d > 0) {
        const a = Math.round(Math.max(0, 1 - d / gl) * 35)
        const p = Jimp.intToRGBA(img.getPixelColor(x, y))
        const nr = Math.min(255, p.r + Math.round((124 - p.r) * a / 255))
        const ng = Math.min(255, p.g + Math.round((109 - p.g) * a / 255))
        const nb = Math.min(255, p.b + Math.round((240 - p.b) * a / 255))
        img.setPixelColor(Jimp.rgbaToInt(nr, ng, nb, 255), x, y)
      }
    }
  }

  await img.writeAsync(path.join(outDir, name))
  const stat = fs.statSync(path.join(outDir, name))
  console.log(`✓ ${name} (${size}x${size}, ${stat.size} bytes)`)
}

async function main() {
  const sizes = [
    [192, 'icon-192.png'],
    [512, 'icon-512.png'],
    [180, 'apple-touch-icon.png'],
    [32, 'favicon-32.png'],
  ]
  for (const [size, name] of sizes) {
    await createIcon(size, name)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
