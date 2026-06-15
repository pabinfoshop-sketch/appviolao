// Gera ícones PNG do app com a guitarra 🎸 em fundo gradient
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

// Cores do app
const BG_TOP = { r: 12, g: 12, b: 20 }    // #0c0c14
const BG_BOT = { r: 18, g: 18, b: 30 }    // #12121e
const ACCENT = { r: 124, g: 109, b: 240 } // #7c6df0
const ACCENT2 = { r: 240, g: 109, b: 138 } // #f06d8a

// SVG com guitarra emoji + branding
function makeSvg(size) {
  const fontSize = Math.floor(size * 0.55)
  const subFontSize = Math.floor(size * 0.08)
  const cornerRadius = Math.floor(size * 0.2)

  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgb(${BG_TOP.r},${BG_TOP.g},${BG_TOP.b})"/>
      <stop offset="100%" stop-color="rgb(${BG_BOT.r},${BG_BOT.g},${BG_BOT.b})"/>
    </linearGradient>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgb(${ACCENT.r},${ACCENT.g},${ACCENT.b})"/>
      <stop offset="100%" stop-color="rgb(${ACCENT2.r},${ACCENT2.g},${ACCENT2.b})"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Fundo gradient arredondado -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bg)"/>

  <!-- Brilho/glow central -->
  <circle cx="${size/2}" cy="${size/2 - size*0.05}" r="${size*0.4}" fill="rgb(${ACCENT.r},${ACCENT.g},${ACCENT.b})" opacity="0.15"/>

  <!-- Guitarra emoji -->
  <text x="50%" y="${size*0.58}" text-anchor="middle" font-size="${fontSize}" filter="url(#glow)">🎸</text>

  <!-- Sub-texto pequeno embaixo -->
  <text x="50%" y="${size*0.86}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" font-size="${subFontSize}" font-weight="700" fill="url(#brand)" letter-spacing="${size*0.005}">songpcmusic</text>
</svg>`
}

async function generate() {
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-180.png', size: 180 }, // apple touch icon
  ]

  const outDir = path.resolve('frontend/dist/icons')
  fs.mkdirSync(outDir, { recursive: true })

  for (const { name, size } of sizes) {
    const svg = Buffer.from(makeSvg(size))
    const png = await sharp(svg, { density: 384 }) // high density for retina
      .png()
      .toBuffer()
    fs.writeFileSync(path.join(outDir, name), png)
    console.log(`✓ ${name} (${size}x${size}, ${png.length} bytes)`)
  }
}

generate().catch(e => { console.error(e); process.exit(1) })
