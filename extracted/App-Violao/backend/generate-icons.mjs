// Gera ícone do app: NOTAS MUSICAIS + CIFRA estilizada
// Simples, elegante, com cores do app (roxo/rosa gradient)
import { PNG } from 'pngjs'
import fs from 'fs'
import path from 'path'

// Cores principais do app (escurecidas)
const BG_TOP = [60, 50, 140]       // #3c328c - roxo escuro
const BG_BOT = [140, 55, 130]      // #8c3782 - magenta escuro
const ACCENT = [255, 255, 255]     // branco
const NOTE_BODY = [255, 255, 255]  // notas brancas
const NOTE_SHADOW = [30, 20, 60]   // sombra das notas

function lerp(a, b, t) { return a + (b - a) * t }
function gradient(t) {
  return [
    Math.round(lerp(BG_TOP[0], BG_BOT[0], t)),
    Math.round(lerp(BG_TOP[1], BG_BOT[1], t)),
    Math.round(lerp(BG_TOP[2], BG_BOT[2], t))
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

// ===========================================
// DESENHA ÍCONE: NOTA MUSICAL (colcheia) - centralizada e conectada
// ===========================================
function drawIcon(data, size) {
  const s = size
  const cx = s / 2
  const cy = s / 2

  // Componentes da nota musical:
  // - Corpo (elipse inclinada) - parte inferior esquerda do conjunto
  // - Haste (linha vertical) - subindo do lado DIREITO do corpo
  // - Bandeirinha (curva) - no topo da haste, curvando para a direita

  // === CORPO (cabeça) da nota - elipse inclinada ===
  // Posicionado para a nota ficar centralizada como um todo
  const noteCx = cx - s * 0.08
  const noteCy = cy + s * 0.12
  const noteRx = s * 0.13
  const noteRy = s * 0.095

  // === HASTE - calculada PRIMEIRO para saber onde o corpo termina ===
  // A haste sai do topo-direito do corpo
  const stemX = noteCx + noteRx * 0.85  // X da haste (lado direito do corpo)
  const stemTopY = cy - s * 0.32        // topo da haste
  const stemBotY = noteCy - noteRy * 0.20  // base da haste (entrando no corpo)
  const stemThickness = s * 0.040
  // Sombra da haste
  drawLine(data, s, stemX + s*0.008, stemTopY + s*0.008, stemX + s*0.008, stemBotY, [25, 18, 55], stemThickness)
  // Haste branca
  drawLine(data, s, stemX, stemTopY, stemX, stemBotY, [255, 255, 255], stemThickness)

  // === CORPO - desenhado por cima para garantir conexão ===
  // Sombra
  fillEllipse(data, s, noteCx + s*0.012, noteCy + s*0.015, noteRx, noteRy, [25, 18, 55], -Math.PI / 4)
  // Corpo branco
  fillEllipse(data, s, noteCx, noteCy, noteRx, noteRy, [255, 255, 255], -Math.PI / 4)
  // Brilho interno
  fillEllipse(data, s, noteCx - noteRx * 0.3, noteCy - noteRy * 0.3, noteRx * 0.40, noteRy * 0.40, [255, 240, 255], -Math.PI / 4)

  // === BANDEIRINHA (laço no topo da haste) ===
  // Curva que sai do topo da haste para a direita
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const px = stemX + s * 0.12 * t
    // Curva suave para baixo
    const py = stemTopY + s * 0.06 * Math.sin(t * Math.PI * 0.7)
    const r = s * 0.030 * (1 - t * 0.30)
    fillCircle(data, s, px, py, r, [255, 255, 255])
  }
}

function makeIcon(size) {
  const img = new PNG({ width: size, height: size })
  const data = img.data

  // Fundo gradient diagonal roxo→rosa (cores do app) + cantos arredondados
  const cornerR = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dCorner = -Infinity
      if (x < cornerR && y < cornerR) {
        dCorner = Math.sqrt((x - cornerR) ** 2 + (y - cornerR) ** 2) - cornerR
      } else if (x > size - cornerR && y < cornerR) {
        dCorner = Math.sqrt((x - (size - cornerR)) ** 2 + (y - cornerR) ** 2) - cornerR
      } else if (x < cornerR && y > size - cornerR) {
        dCorner = Math.sqrt((x - cornerR) ** 2 + (y - (size - cornerR)) ** 2) - cornerR
      } else if (x > size - cornerR && y > size - cornerR) {
        dCorner = Math.sqrt((x - (size - cornerR)) ** 2 + (y - (size - cornerR)) ** 2) - cornerR
      } else {
        dCorner = -1
      }
      if (dCorner > 0) continue
      // Gradient diagonal (135°)
      const t = (x + y) / (2 * size)
      const [r, g, b] = gradient(t)
      let a = 255
      if (dCorner > -1) a = Math.round(255 * Math.max(0, Math.min(1, 1 + dCorner)))
      setPixel(data, size, x, y, r, g, b, a)
    }
  }

  // Brilho/highlight no canto superior esquerdo
  const glowR = size * 0.4
  const glowCx = size * 0.3
  const glowCy = size * 0.3
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

  drawIcon(data, size)
  return PNG.sync.write(img)
}

async function generate() {
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32.png', size: 32 },
  ]
  const outDir = path.resolve('../frontend/dist/icons')
  fs.mkdirSync(outDir, { recursive: true })
  for (const { name, size } of sizes) {
    const png = makeIcon(size)
    fs.writeFileSync(path.join(outDir, name), png)
    console.log(`✓ ${name} (${size}x${size}, ${png.length} bytes)`)
  }
}

generate().catch(e => { console.error(e); process.exit(1) })
