import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

// CRC32 table for PNG chunks
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function writePng(path, width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  writeFileSync(
    path,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
  );
}

// SDF-style point sampling for the Helper brand mark.
const BRAND = {
  // gradient endpoints (top-left to bottom-right)
  start: [17, 17, 17], // #111111
  end: [63, 63, 70], // #3F3F46
  white: [255, 255, 255],
};

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Distance from point p to a line segment a-b
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function blend(dst, src, alpha) {
  const a = alpha / 255;
  return [
    Math.round(dst[0] * (1 - a) + src[0] * a),
    Math.round(dst[1] * (1 - a) + src[1] * a),
    Math.round(dst[2] * (1 - a) + src[2] * a),
  ];
}

function renderMark(size, opts = {}) {
  const { transparent = false, padding = 0 } = opts;
  const buf = Buffer.alloc(size * size * 4);
  // Geometry: 64-unit canonical viewBox scaled to (size - 2*padding) and centered
  const inner = size - padding * 2;
  const scale = inner / 64;
  const ox = padding;
  const oy = padding;

  // Stroke radii for "H"
  const strokeR = 3 * scale; // half of stroke-width 6

  // "H" geometry: two stems and one crossbar.
  const segs = [
    [21, 16, 21, 48],
    [43, 16, 43, 48],
    [21, 32, 43, 32],
  ].map(([ax, ay, bx, by]) => [ox + ax * scale, oy + ay * scale, ox + bx * scale, oy + by * scale]);

  const dotX = ox + 50 * scale;
  const dotY = oy + 14 * scale;
  const dotR = 3 * scale;

  // Background rounded rect
  const radius = 14 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded rect mask
      let bgAlpha = 0;
      const localX = x - ox;
      const localY = y - oy;
      if (!transparent) {
        // Distance from point to rounded rect of size [0..inner]
        const px = localX;
        const py = localY;
        const w = inner;
        const h = inner;
        const r = radius;
        const dx = Math.max(r - px, px - (w - r), 0);
        const dy = Math.max(r - py, py - (h - r), 0);
        const inside = px >= 0 && py >= 0 && px <= w && py <= h;
        const distOut = Math.sqrt(dx * dx + dy * dy) - 0; // 0 because we already account inside corners
        if (inside) {
          // Inside bounding box; corners need round masking
          const corner = Math.sqrt(dx * dx + dy * dy);
          bgAlpha = 255 * (1 - smoothstep(r - 0.7, r + 0.7, corner));
        } else {
          bgAlpha = 0;
        }
      }

      // Build pixel color starting from canvas (transparent or gradient bg)
      let rgb;
      let alpha;
      if (transparent) {
        rgb = [0, 0, 0];
        alpha = 0;
      } else {
        const t = (localX + localY) / (inner * 2);
        rgb = mix(BRAND.start, BRAND.end, Math.max(0, Math.min(1, t)));
        alpha = bgAlpha;
      }

      // "H" strokes (white)
      let inkAlpha = 0;
      for (const [ax, ay, bx, by] of segs) {
        const d = distToSeg(x, y, ax, ay, bx, by);
        const a = (1 - smoothstep(strokeR - 0.8, strokeR + 0.8, d)) * 255;
        if (a > inkAlpha) inkAlpha = a;
      }
      if (inkAlpha > 0) {
        rgb = blend(rgb, BRAND.white, inkAlpha);
        alpha = Math.max(alpha, inkAlpha);
      }

      // Small white signal dot.
      const dxd = x - dotX;
      const dyd = y - dotY;
      const ddist = Math.sqrt(dxd * dxd + dyd * dyd);
      const dotAlpha = (1 - smoothstep(dotR - 0.8, dotR + 0.8, ddist)) * 255;
      if (dotAlpha > 0) {
        rgb = blend(rgb, BRAND.white, dotAlpha * 0.82);
        alpha = Math.max(alpha, dotAlpha);
      }

      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
      buf[i + 3] = alpha;
    }
  }
  return buf;
}

function renderMaskable(size) {
  // Maskable: 20% safe-zone padding around the mark; full bleed bg
  const buf = Buffer.alloc(size * size * 4);
  const padding = Math.round(size * 0.1); // 10% padding inside icon
  const inner = renderMark(size - padding * 2, { transparent: false });
  // Solid bg covering the whole tile (use start color)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = (x + y) / (size * 2);
      const rgb = mix(BRAND.start, BRAND.end, Math.max(0, Math.min(1, t)));
      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
      buf[i + 3] = 255;
    }
  }
  // Composite inner mark
  const ix = padding;
  const iy = padding;
  const iw = size - padding * 2;
  for (let y = 0; y < iw; y++) {
    for (let x = 0; x < iw; x++) {
      const sIdx = (y * iw + x) * 4;
      const dIdx = ((iy + y) * size + (ix + x)) * 4;
      const a = inner[sIdx + 3];
      if (a === 0) continue;
      const t = a / 255;
      buf[dIdx] = Math.round(buf[dIdx] * (1 - t) + inner[sIdx] * t);
      buf[dIdx + 1] = Math.round(buf[dIdx + 1] * (1 - t) + inner[sIdx + 1] * t);
      buf[dIdx + 2] = Math.round(buf[dIdx + 2] * (1 - t) + inner[sIdx + 2] * t);
      buf[dIdx + 3] = 255;
    }
  }
  return buf;
}

function renderOgImage(width, height) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const tx = x / width;
      const ty = y / height;
      // Dark gradient
      const rgb = mix([17, 17, 17], [185, 75, 13], (tx + ty) / 2);
      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
      buf[i + 3] = 255;
    }
  }
  // Mark on the left
  const markSize = 280;
  const mark = renderMark(markSize);
  const mx = 100;
  const my = Math.round((height - markSize) / 2);
  for (let y = 0; y < markSize; y++) {
    for (let x = 0; x < markSize; x++) {
      const sIdx = (y * markSize + x) * 4;
      const dy = my + y;
      const dx = mx + x;
      if (dx < 0 || dx >= width || dy < 0 || dy >= height) continue;
      const dIdx = (dy * width + dx) * 4;
      const a = mark[sIdx + 3] / 255;
      if (a === 0) continue;
      buf[dIdx] = Math.round(buf[dIdx] * (1 - a) + mark[sIdx] * a);
      buf[dIdx + 1] = Math.round(buf[dIdx + 1] * (1 - a) + mark[sIdx + 1] * a);
      buf[dIdx + 2] = Math.round(buf[dIdx + 2] * (1 - a) + mark[sIdx + 2] * a);
    }
  }
  return buf;
}

mkdirSync('public', { recursive: true });

writePng('public/icon-192.png', 192, 192, renderMark(192));
console.log('✓ public/icon-192.png');

writePng('public/icon-512.png', 512, 512, renderMark(512));
console.log('✓ public/icon-512.png');

writePng('public/icon-maskable-512.png', 512, 512, renderMaskable(512));
console.log('✓ public/icon-maskable-512.png');

writePng('public/apple-touch-icon.png', 180, 180, renderMark(180));
console.log('✓ public/apple-touch-icon.png');

writePng('public/favicon-32.png', 32, 32, renderMark(32));
console.log('✓ public/favicon-32.png');

writePng('public/og.png', 1200, 630, renderOgImage(1200, 630));
console.log('✓ public/og.png');
