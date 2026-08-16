// A ZIP writer in about eighty lines.
//
// Needed because the useful office formats — .thmx for PowerPoint, .sketchpalette,
// anything OOXML — are zip containers, and this repo does not take dependencies.
//
// Everything is STORED, not deflated. That makes the file bigger and the code a
// tenth of the size, and a design theme is a few kilobytes of XML either way.

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

const utf8 = (s) => new TextEncoder().encode(s);

/**
 * @param {Array<{name: string, data: string|Uint8Array}>} files
 * @returns {Uint8Array} a complete zip archive
 */
export function zip(files) {
  const entries = files.map((f) => {
    const data = typeof f.data === 'string' ? utf8(f.data) : f.data;
    return { name: utf8(f.name), data, crc: crc32(data) };
  });

  const chunks = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const local = new Uint8Array(30 + e.name.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); // local file header
    v.setUint16(4, 20, true); // version needed
    v.setUint16(6, 0, true); // flags
    v.setUint16(8, 0, true); // method: stored
    // Zip stores a DOS timestamp. A fixed one keeps the archive byte-identical
    // between runs, which is the same determinism promise as everything else
    // here — a theme file that differs every build is a diff nobody can read.
    v.setUint16(10, 0, true); // time 00:00
    v.setUint16(12, 0x21, true); // date 1980-01-01
    v.setUint32(14, e.crc, true);
    v.setUint32(18, e.data.length, true);
    v.setUint32(22, e.data.length, true);
    v.setUint16(26, e.name.length, true);
    v.setUint16(28, 0, true);
    local.set(e.name, 30);

    const c = new Uint8Array(46 + e.name.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory header
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, e.crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, e.name.length, true);
    cv.setUint32(42, offset, true);
    c.set(e.name, 46);
    central.push(c);

    chunks.push(local, e.data);
    offset += local.length + e.data.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of [...chunks, ...central, end]) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
