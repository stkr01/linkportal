// Engångsskript: genererar LinkPortal-ikoner (PNG) utan externa beroenden.
// Kör: node make-icons.js  (kräver ingen npm-installation)
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Ragn-Sells grön
const BG = [0, 131, 62, 255]; // #00833e
const FG = [255, 255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, pixels) {
  // pixels: Uint8Array length size*size*4 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPx(px, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
  px[i + 3] = color[3];
}

function drawLink(size) {
  const px = Buffer.alloc(size * size * 4);
  const r = Math.round(size * 0.18); // hörnradie
  // Bakgrund med rundade hörn
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      const corners = [
        [r, r],
        [size - 1 - r, r],
        [r, size - 1 - r],
        [size - 1 - r, size - 1 - r],
      ];
      if (x < r && y < r) inside = (x - r) ** 2 + (y - r) ** 2 <= r * r;
      else if (x > size - 1 - r && y < r) inside = (x - (size - 1 - r)) ** 2 + (y - r) ** 2 <= r * r;
      else if (x < r && y > size - 1 - r) inside = (x - r) ** 2 + (y - (size - 1 - r)) ** 2 <= r * r;
      else if (x > size - 1 - r && y > size - 1 - r)
        inside = (x - (size - 1 - r)) ** 2 + (y - (size - 1 - r)) ** 2 <= r * r;
      if (inside) setPx(px, size, x, y, BG);
    }
  }

  // Rita två sammanlänkade ringar (kedja) i vitt
  const cx1 = size * 0.40;
  const cy1 = size * 0.40;
  const cx2 = size * 0.60;
  const cy2 = size * 0.60;
  const ringR = size * 0.20;
  const thick = Math.max(1.4, size * 0.085);
  function ring(cx, cy) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.sqrt((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2);
        if (Math.abs(d - ringR) <= thick / 2) setPx(px, size, x, y, FG);
      }
    }
  }
  ring(cx1, cy1);
  ring(cx2, cy2);
  return px;
}

[16, 32, 48, 128].forEach((size) => {
  const png = encodePNG(size, drawLink(size));
  fs.writeFileSync(path.join(OUT_DIR, `icon${size}.png`), png);
  console.log(`icons/icon${size}.png (${png.length} bytes)`);
});
console.log('Klart.');
