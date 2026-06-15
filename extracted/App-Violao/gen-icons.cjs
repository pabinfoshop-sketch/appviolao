const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const outDir = path.resolve(__dirname, 'frontend/public/icons')
fs.mkdirSync(outDir, { recursive: true })

const sizes = [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
  [32, 'favicon-32.png'],
  [48, 'icon-48.png'],
]

function singleNoteSVG(size, small) {
  const s = size
  if (small) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <rect width="${s}" height="${s}" rx="${Math.round(s*0.22)}" fill="#0e0e16"/>
    </svg>`
  }

  const r = Math.round(s * 0.22)

  // Single large music note, centered and lowered
  const cx = s * 0.52
  const cy = s * 0.66
  const nrX = s * 0.14
  const nrY = s * 0.11

  const stemW = s * 0.042
  const stemX = cx + nrX * 0.4
  const stemTop = s * 0.22
  const stemBot = cy - nrY * 0.35

  const flagSX = stemX + stemW
  const flagSY = stemTop
  const fw = s * 0.14
  const fh = s * 0.19

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <defs>
      <linearGradient id="noteGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8ccff"/>
        <stop offset="50%" stop-color="#d4a8ff"/>
        <stop offset="100%" stop-color="#b888ee"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#a078ff" stop-opacity="0.30"/>
        <stop offset="70%" stop-color="#a078ff" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#a078ff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Solid dark background -->
    <rect width="${s}" height="${s}" rx="${r}" fill="#0e0e16"/>

    <!-- Subtle glow behind note -->
    <circle cx="${cx}" cy="${cy - s*0.04}" r="${s*0.42}" fill="url(#glow)"/>

    <!-- Note head -->
    <ellipse cx="${cx}" cy="${cy}" rx="${nrX}" ry="${nrY}" fill="url(#noteGrad)"
             transform="rotate(-8, ${cx}, ${cy})"/>

    <!-- Stem -->
    <rect x="${stemX}" y="${stemTop}" width="${stemW}" height="${stemBot - stemTop}"
          rx="${stemW*0.3}" fill="url(#noteGrad)"/>

    <!-- Flag -->
    <path d="M ${flagSX},${flagSY}
             C ${Math.round(flagSX + fw*0.6)},${Math.round(flagSY - fh*0.12)}
               ${Math.round(flagSX + fw*1.1)},${Math.round(flagSY + fh*0.25)}
               ${Math.round(flagSX + fw*0.8)},${Math.round(flagSY + fh*0.55)}
             C ${Math.round(flagSX + fw*0.8)},${Math.round(flagSY + fh*0.55)}
               ${Math.round(flagSX + fw*0.35)},${Math.round(flagSY + fh*0.4)}
               ${Math.round(flagSX - stemW*0.3)},${Math.round(flagSY + fh*0.1)}
             Z"
          fill="url(#noteGrad)"/>

    <!-- Subtle highlight -->
    <ellipse cx="${cx - nrX*0.25}" cy="${cy - nrY*0.3}" rx="${nrX*0.35}" ry="${nrY*0.3}"
             fill="#ffffff15"/>
  </svg>`
}

for (const [size, name] of sizes) {
  const out = path.join(outDir, name)
  const isSmall = size <= 48
  const svg = singleNoteSVG(size, isSmall)
  const svgPath = path.join(outDir, 'temp-icon.svg')
  fs.writeFileSync(svgPath, svg)

  console.log(`Generating ${name} (${size}x${size})...`)
  try {
    execSync(
      `magick -background none -density 576 "${svgPath}" -resize ${size}x${size} -quality 95 "${out}"`,
      { stdio: 'pipe', timeout: 30000 }
    )
    const bytes = fs.statSync(out).size
    console.log(`  ✓ ${bytes} bytes`)
  } catch (e) {
    const stderr = e.stderr?.toString() || e.message
    console.error(`  ✗ ${stderr.slice(0, 300)}`)
  } finally {
    try { fs.unlinkSync(svgPath) } catch {}
  }
}
