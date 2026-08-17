// A PNG encoder and decoder, from nothing.
//
// The rest of this project is proudly zero-dependency, and a favicon package
// or an image-derived palette would normally be the one place that breaks —
// pull in `sharp` or `pngjs` and the "0 bytes runtime, nothing to install"
// claim on the README stops being true for anyone building this tool itself.
//
// It doesn't have to be. PNG is a documented format and Node ships zlib in
// core (not an npm dependency, just the platform) — that's the only hard part.
// This supports what actually gets exported by design tools and browsers:
// 8-bit depth, all five colour types, non-interlaced. Adam7-interlaced PNGs
// are rejected with a clear error rather than silently mishandled — nobody
// exports one of those by accident, and decoding it correctly is a distinct
// and much bigger problem than this file is trying to solve.

import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// --- CRC32 -------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// --- encode ------------------------------------------------------------------

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode raw RGBA pixels — the same `{ data, width, height }` shape used
 * throughout `quantise.mjs` — as a PNG file.
 *
 * Every scanline is emitted with filter type 0 (None). That costs a little
 * file size against a real encoder's adaptive filtering, and buys back all
 * of the complexity of choosing a filter per row — a fair trade for icons
 * measured in kilobytes, not photographs.
 */
export function encodePng({ data, width, height }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    Uint8Array.prototype.set.call(raw, data.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace: none

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- decode ------------------------------------------------------------------

const BPP_BY_COLOUR_TYPE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }; // bytes per pixel, at 8-bit depth

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  let prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart];
    const row = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const outRow = out.subarray(y * stride, y * stride + stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? outRow[x - bpp] : 0;
      const b = prevRow[x];
      const cc = x >= bpp ? prevRow[x - bpp] : 0;
      let v = row[x];
      switch (filterType) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: v = (v + paeth(a, b, cc)) & 0xff; break;
        default: throw new Error(`Unknown PNG filter type ${filterType} — this file may be corrupt.`);
      }
      outRow[x] = v;
    }
    prevRow = outRow;
  }
  return out;
}

/**
 * Decode a PNG file into `{ data: Uint8ClampedArray, width, height }` —
 * exactly the shape `quantise.mjs` expects, so `notugly palette` can hand it
 * straight to `paletteFromImage` with no browser and no `<canvas>` involved.
 */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file (bad signature).');

  let offset = 8;
  let ihdr = null;
  let palette = null;
  let trns = null;
  const idatChunks = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colourType: data[9],
        interlace: data[12],
      };
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (!ihdr) throw new Error('No IHDR chunk — not a valid PNG.');
  if (ihdr.bitDepth !== 8) throw new Error(`${ihdr.bitDepth}-bit PNGs aren't supported, only 8-bit. Re-export at 8 bits per channel.`);
  if (ihdr.interlace !== 0) throw new Error('Adam7-interlaced PNGs aren\'t supported. Re-export as a non-interlaced PNG.');

  const bpp = BPP_BY_COLOUR_TYPE[ihdr.colourType];
  if (!bpp) throw new Error(`Unsupported PNG colour type ${ihdr.colourType}.`);

  const raw = inflateSync(Buffer.concat(idatChunks));
  const pixels = unfilter(raw, ihdr.width, ihdr.height, bpp);

  const rgba = new Uint8ClampedArray(ihdr.width * ihdr.height * 4);
  for (let i = 0, p = 0; i < pixels.length; i += bpp, p += 4) {
    switch (ihdr.colourType) {
      case 0: // greyscale
        rgba[p] = rgba[p + 1] = rgba[p + 2] = pixels[i];
        rgba[p + 3] = 255;
        break;
      case 2: // RGB
        rgba[p] = pixels[i];
        rgba[p + 1] = pixels[i + 1];
        rgba[p + 2] = pixels[i + 2];
        rgba[p + 3] = 255;
        break;
      case 3: { // palette
        const idx = pixels[i];
        rgba[p] = palette[idx * 3];
        rgba[p + 1] = palette[idx * 3 + 1];
        rgba[p + 2] = palette[idx * 3 + 2];
        rgba[p + 3] = trns && idx < trns.length ? trns[idx] : 255;
        break;
      }
      case 4: // grey + alpha
        rgba[p] = rgba[p + 1] = rgba[p + 2] = pixels[i];
        rgba[p + 3] = pixels[i + 1];
        break;
      case 6: // RGBA
        rgba[p] = pixels[i];
        rgba[p + 1] = pixels[i + 1];
        rgba[p + 2] = pixels[i + 2];
        rgba[p + 3] = pixels[i + 3];
        break;
    }
  }

  return { data: rgba, width: ihdr.width, height: ihdr.height };
}

// --- ICO container -------------------------------------------------------------

/**
 * Bundle a set of PNGs into a single `.ico` — the modern (and much simpler)
 * form, where each directory entry just points at a PNG-compressed image
 * rather than a raw BMP bitmap. Every current browser and OS reads this.
 */
export function encodeIco(images) {
  // images: [{ size, png: Buffer }]
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  const bodies = [];
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // 0 means 256
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    bodies.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...bodies]);
}
