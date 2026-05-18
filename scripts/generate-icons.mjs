import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

// CRC32 lookup table
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
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

function generatePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw scanlines: filter byte (0) + RGB per pixel
  const row = 1 + size * 3;
  const raw = Buffer.allocUnsafe(size * row);
  for (let y = 0; y < size; y++) {
    const base = y * row;
    raw[base] = 0;
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3] = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });

// Brand color #7c3aed (violet-700)
const R = 124, G = 58, B = 237;

writeFileSync('public/icon-192.png', generatePNG(192, R, G, B));
writeFileSync('public/icon-512.png', generatePNG(512, R, G, B));

console.log('✓ public/icon-192.png');
console.log('✓ public/icon-512.png');
