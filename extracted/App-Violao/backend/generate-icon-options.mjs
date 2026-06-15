// Gera 3 opções de ícone para o usuário escolher
import { PNG } from 'pngjs'
import fs from 'fs'
import path from 'path'

const BG_TOP = [94, 79, 220]
const BG_BOT = [200, 79, 184]
const ACCENT = [255, 255, 255]

function lerp(a, b, t) { return a + (b - a) * t }
function gradient(t, top, bot) {
  return [
    Math.round(lerp(top[0], bot[0], t)),
    Math.round(lerp(top[1], bot[1], t)),
    Math.round(lerp(top[2], bot[2], t))
  ]
}
function setPixel(data, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const idx = (w * y + x) << 2
  if (a < 255) {
    const srcA = a / 255, dstA = data[idx + 3] / 255
    const outA = srcA + dstA * (1 - srcA)
    if (outA > 0) {
      data[idx]     = Math.round((r * srcA + data[idx] * dstA * (1 - srcA)) / outA)
      data[idx + 1] = Math.round((g * srcA + data[idx + 1] * dstA * (1 - srcA)) / outA)
      data[idx + 2] = Math.round((b * srcA + data[idx + 2] * dstA * (1 - srcA)) / outA)
      data[idx + 3] = Math.round(outA * 255)
    }
  } else {
    data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a
  }
}
function fillCircle(data, w, cx, cy, r, color) {
  const r2 = r * r
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 <= r2) {
        const d = Math.sqrt(d2)
        let a = 255
        if (d > r - 1) a = Math.round(255 * Math.max(0, 1 - (d - r + 1)))
        setPixel(data, w, x, y, color[0], color[1], color[2], a)
      }
    }
  }
}
function fillEllipse(data, w, cx, cy, rx, ry, color, rotation = 0) {
  const cos = Math.cos(rotation), sin = Math.sin(rotation)
  const m = Math.max(rx, ry)
  for (let y = Math.floor(cy - m); y <= Math.ceil(cy + m); y++) {
    for (let x = Math.floor(cx - m); x <= Math.ceil(cx + m); x++) {
      const dx = x - cx, dy = y - cy
      const px = dx * cos + dy * sin
      const py = -dx * sin + dy * cos
      const v = (px * px) / (rx * rx) + (py * py) / (ry * ry)
      if (v <= 1) {
        let a = 255
        if (v > 0.85) a = Math.round(255 * Math.max(0, 1 - (v - 0.85) * 4))
        setPixel(data, w, x, y, color[0], color[1], color[2], a)
      }
    }
  }
}
function drawLine(data, w, x1, y1, x2, y2, color, thickness = 1) {
  const dx = x2 - x1, dy = y2 - y1
  const steps = Math.max(Math.abs(dx), Math.abs(dy))
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    fillCircle(data, w, x1 + dx * t, y1 + dy * t, thickness, color)
  }
}
function fillRect(data, w, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      setPixel(data, w, x, y, color[0], color[1], color[2])
    }
  }
}
function pointInPoly(x, y, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y
    const xj = points[j].x, yj = points[j].y
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}
function fillPolygon(data, w, points, color) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      if (pointInPoly(x, y, points)) setPixel(data, w, x, y, color[0], color[1], color[2])
    }
  }
}

// Fundo padrão com gradient
function makeBackground(data, size) {
  const cornerR = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dCorner = -Infinity
      if (x < cornerR && y < cornerR) dCorner = Math.sqrt((x - cornerR) ** 2 + (y - cornerR) ** 2) - cornerR
      else if (x > size - cornerR && y < cornerR) dCorner = Math.sqrt((x - (size - cornerR)) ** 2 + (y - cornerR) ** 2) - cornerR
      else if (x < cornerR && y > size - cornerR) dCorner = Math.sqrt((x - cornerR) ** 2 + (y - (size - cornerR)) ** 2) - cornerR
      else if (x > size - cornerR && y > size - cornerR) dCorner = Math.sqrt((x - (size - cornerR)) ** 2 + (y - (size - cornerR)) ** 2) - cornerR
      else dCorner = -1
      if (dCorner > 0) continue
      const t = (x + y) / (2 * size)
      const [r, g, b] = gradient(t, BG_TOP, BG_BOT)
      let a = 255
      if (dCorner > -1) a = Math.round(255 * Math.max(0, Math.min(1, 1 + dCorner)))
      setPixel(data, size, x, y, r, g, b, a)
    }
  }
}
function addHighlight(data, size) {
  const glowR = size * 0.4
  const glowCx = size * 0.3, glowCy = size * 0.3
  for (let y = Math.floor(glowCy - glowR); y < Math.ceil(glowCy + glowR); y++) {
    for (let x = Math.floor(glowCx - glowR); x < Math.ceil(glowCx + glowR); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const dx = x - glowCx, dy = y - glowCy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < glowR) {
        const intensity = Math.pow(1 - d/glowR, 2) * 0.30
        const idx = (size * y + x) << 2
        data[idx]     = Math.min(255, data[idx]     + 255 * intensity)
        data[idx + 1] = Math.min(255, data[idx + 1] + 255 * intensity)
        data[idx + 2] = Math.min(255, data[idx + 2] + 255 * intensity)
      }
    }
  }
}

// =========================================
// OPÇÃO A: Letra "♪" (nota musical) GRANDE e elegante
// =========================================
function drawOptionA(data, size) {
  const s = size
  const cx = s / 2, cy = s / 2

  // Nota musical grande e centralizada
  // Haste vertical
  const stemX = cx + s * 0.10
  const stemTopY = cy - s * 0.32
  const stemBotY = cy - s * 0.02
  drawLine(data, s, stemX, stemTopY, stemX, stemBotY, [255, 255, 255], s * 0.035)

  // Bandeirinha (laço da colcheia) - curva no topo
  for (let i = 0; i < 12; i++) {
    const t = i / 11
    const angle = t * Math.PI
    const px = stemX + s * 0.18 * t
    const py = stemTopY - s * 0.10 * Math.sin(angle)
    const r = s * 0.045 * (1 - t * 0.3)
    fillCircle(data, s, px, py, r, [255, 255, 255])
  }

  // Corpo da nota (elipse inclinada) na base da haste
  const noteCx = cx - s * 0.04
  const noteCy = cy - s * 0.02
  const noteRx = s * 0.10
  const noteRy = s * 0.075
  fillEllipse(data, s, noteCx, noteCy, noteRx, noteRy, [255, 255, 255], -Math.PI / 4)
  // Sombra interna
  fillEllipse(data, s, noteCx + s*0.012, noteCy + s*0.012, noteRx * 0.85, noteRy * 0.85, [180, 130, 200], -Math.PI / 4)
  // Brilho
  fillEllipse(data, s, noteCx - noteRx * 0.3, noteCy - noteRy * 0.3, noteRx * 0.4, noteRy * 0.4, [255, 240, 255], -Math.PI / 4)
}

// =========================================
// OPÇÃO B: Logo "M" estilizado (inicial de Music) com onda sonora
// =========================================
function drawOptionB(data, size) {
  const s = size
  const cx = s / 2, cy = s / 2

  // Letra "M" estilizada - blocos angulares
  const mw = s * 0.40
  const mh = s * 0.45
  const mx = cx - mw / 2
  const my = cy - mh / 2
  const stroke = s * 0.07

  // M esquerda (perna esquerda + perna direita)
  // Perna esquerda
  fillRect(data, s, mx, my, mx + stroke, my + mh, [255, 255, 255])
  // Perna direita
  fillRect(data, s, mx + mw - stroke, my, mx + mw, my + mh, [255, 255, 255])
  // Diagonal esquerda (descendo)
  const dx1 = mx + stroke
  const dy1 = my
  const dx2 = mx + mw/2
  const dy2 = my + mh/2
  for (let i = 0; i < mh/2; i++) {
    const t = i / (mh/2)
    const x1 = dx1 + (dx2 - dx1) * t
    const y1 = dy1 + (dy2 - dy1) * t
    const x2 = dx1 + (dx2 - dx1) * t + stroke
    const y2 = dy1 + (dy2 - dy1) * t + stroke
    fillRect(data, s, Math.floor(x1), Math.floor(y1), Math.ceil(x2), Math.ceil(y2), [255, 255, 255])
  }
  // Diagonal direita (subindo)
  const sx1 = mx + mw/2
  const sy1 = my + mh/2
  const sx2 = mx + mw - stroke
  const sy2 = my
  for (let i = 0; i < mh/2; i++) {
    const t = i / (mh/2)
    const x1 = sx1 + (sx2 - sx1) * t
    const y1 = sy1 + (sy2 - sy1) * t
    const x2 = sx1 + (sx2 - sx1) * t + stroke
    const y2 = sy1 + (sy2 - sy1) * t + stroke
    fillRect(data, s, Math.floor(x1), Math.floor(y1), Math.ceil(x2), Math.ceil(y2), [255, 255, 255])
  }

  // Onda sonora embaixo (3 arcos)
  const waveY = my + mh + s * 0.06
  const waveR = s * 0.025
  for (let i = 0; i < 3; i++) {
    const wx = cx + (i - 1) * s * 0.10
    const wr = waveR * (1 + i * 0.3)
    fillCircle(data, s, wx, waveY, wr, [255, 255, 255, 200 - i * 30])
  }
}

// =========================================
// OPÇÃO C: Hexágono com nota musical dentro (estilo app moderno)
// =========================================
function drawOptionC(data, size) {
  const s = size
  const cx = s / 2, cy = s / 2

  // Hexágono central
  const hexR = s * 0.38
  const hexPoints = []
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + i * Math.PI / 3
    hexPoints.push({
      x: cx + Math.cos(angle) * hexR,
      y: cy + Math.sin(angle) * hexR
    })
  }
  // Hexágono branco semi-transparente (sombra)
  const hexShadow = hexPoints.map(p => ({ x: p.x + s*0.015, y: p.y + s*0.02 }))
  fillPolygon(data, s, hexShadow, [40, 30, 80])
  // Hexágono branco
  fillPolygon(data, s, hexPoints, [255, 255, 255, 240])

  // Nota musical roxa dentro do hexágono
  const ncx = cx
  const ncy = cy + s * 0.02
  // Haste
  drawLine(data, s, ncx + s * 0.08, ncy - s * 0.20, ncx + s * 0.08, ncy, [124, 109, 240], s * 0.025)
  // Bandeirinha
  for (let i = 0; i < 8; i++) {
    const t = i / 7
    const px = ncx + s * 0.08 + s * 0.10 * t
    const py = ncy - s * 0.20 - s * 0.05 * Math.sin(t * Math.PI)
    fillCircle(data, s, px, py, s * 0.025, [124, 109, 240])
  }
  // Corpo da nota (elipse)
  fillEllipse(data, s, ncx - s * 0.02, ncy, s * 0.06, s * 0.045, [124, 109, 240], -Math.PI / 4)
}

// =========================================
// OPÇÃO D: Waveform sonoro (linhas verticais de diferentes alturas)
// =========================================
function drawOptionD(data, size) {
  const s = size
  const cx = s / 2, cy = s / 2

  // 5 barras verticais (waveform) centralizadas
  const barCount = 5
  const barW = s * 0.10
  const gap = s * 0.04
  const totalW = barCount * barW + (barCount - 1) * gap
  const startX = cx - totalW / 2
  const heights = [0.45, 0.80, 1.00, 0.75, 0.50]  // alturas relativas (pico central)

  for (let i = 0; i < barCount; i++) {
    const h = s * 0.45 * heights[i]
    const x = startX + i * (barW + gap)
    const y1 = cy - h / 2
    const y2 = cy + h / 2
    // Cantos arredondados: vou desenhar com pill shape
    const r = barW / 2
    // Retângulo principal
    fillRect(data, s, Math.floor(x), Math.floor(y1 + r), Math.ceil(x + barW), Math.ceil(y2 - r), [255, 255, 255])
    // Top circle
    fillCircle(data, s, x + barW/2, y1 + r, r, [255, 255, 255])
    // Bottom circle
    fillCircle(data, s, x + barW/2, y2 - r, r, [255, 255, 255])
  }
}

function makeIcon(size, option) {
  const img = new PNG({ width: size, height: size })
  const data = img.data
  makeBackground(data, size)
  addHighlight(data, size)
  if (option === 'A') drawOptionA(data, size)
  else if (option === 'B') drawOptionB(data, size)
  else if (option === 'C') drawOptionC(data, size)
  else if (option === 'D') drawOptionD(data, size)
  return PNG.sync.write(img)
}

async function generate() {
  const outDir = path.resolve('../frontend/dist/icons-options')
  fs.mkdirSync(outDir, { recursive: true })

  for (const opt of ['A', 'B', 'C', 'D']) {
    const png = makeIcon(512, opt)
    fs.writeFileSync(path.join(outDir, `option-${opt}.png`), png)
    console.log(`✓ option-${opt}.png (${png.length} bytes)`)
  }
}

generate().catch(e => { console.error(e); process.exit(1) })
