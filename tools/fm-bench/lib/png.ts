// Minimal deterministic PNG (RGB8) encoder built on Bun.deflateSync and Bun.hash.crc32.

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, Bun.hash.crc32(out.subarray(4, 8 + data.length)) >>> 0);
  return out;
}

/** Encodes a seeded gradient-plus-pattern image so every file differs and decodes for real. */
export function encodePng(width: number, height: number, seed: number): Uint8Array {
  const stride = width * 3 + 1;
  const raw = new Uint8Array(stride * height);
  const r0 = seed & 0xff;
  const g0 = (seed >>> 8) & 0xff;
  const b0 = (seed >>> 16) & 0xff;
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3;
      const cell = ((x >> 5) ^ (y >> 5) ^ seed) & 1 ? 40 : 0;
      raw[p] = (r0 + (x * 255) / width + cell) & 0xff;
      raw[p + 1] = (g0 + (y * 255) / height) & 0xff;
      raw[p + 2] = (b0 + ((x + y) * 127) / (width + height) + cell) & 0xff;
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", Bun.deflateSync(raw, { level: 6 })),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
