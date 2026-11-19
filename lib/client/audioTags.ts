'use client';
/**
 * Reads what an audio file says about itself before it is uploaded: ID3v2 (2.2 / 2.3 / 2.4) title,
 * artist, album, year, composer, lyricist and cover picture, plus the duration from the browser's
 * own decoder. Adapted from the reader in Homy.
 */
export interface AudioTags {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  composer?: string;
  lyricist?: string;
  picture?: Blob;
}

const latin1 = new TextDecoder('windows-1252');
const utf8 = new TextDecoder('utf-8');
const utf16le = new TextDecoder('utf-16le');
const utf16be = new TextDecoder('utf-16be');

function decode(bytes: Uint8Array, enc: number): string {
  let text: string;
  if (enc === 1) {
    if (bytes[0] === 0xfe && bytes[1] === 0xff) text = utf16be.decode(bytes.subarray(2));
    else if (bytes[0] === 0xff && bytes[1] === 0xfe) text = utf16le.decode(bytes.subarray(2));
    else text = utf16le.decode(bytes);
  } else if (enc === 2) text = utf16be.decode(bytes);
  else if (enc === 3) text = utf8.decode(bytes);
  else text = latin1.decode(bytes);
  return text.split('\u0000')[0].trim(); // v2.4 may hold several NUL-separated values
}

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));
const syncsafe = (b: Uint8Array, at: number) => ((b[at] & 0x7f) << 21) | ((b[at + 1] & 0x7f) << 14) | ((b[at + 2] & 0x7f) << 7) | (b[at + 3] & 0x7f);
const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

function resync(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
}

function picture(data: Uint8Array, v22: boolean): { blob: Blob; type: number } | undefined {
  const enc = data[0];
  let p: number;
  let mime: string;
  if (v22) {
    mime = ascii(data, 1, 3).toUpperCase() === 'PNG' ? 'image/png' : 'image/jpeg';
    p = 4;
  } else {
    const end = data.indexOf(0, 1);
    if (end < 0) return undefined;
    mime = ascii(data, 1, end - 1).toLowerCase() || 'image/jpeg';
    p = end + 1;
  }
  const type = data[p++];
  if (enc === 1 || enc === 2) {
    while (p + 1 < data.length && !(data[p] === 0 && data[p + 1] === 0)) p += 2;
    p += 2;
  } else {
    while (p < data.length && data[p] !== 0) p++;
    p++;
  }
  if (p >= data.length) return undefined;
  if (!mime.includes('/')) mime = `image/${mime}`;
  return { blob: new Blob([data.slice(p)], { type: mime.replace('image/jpg', 'image/jpeg') }), type };
}

export async function readTags(file: Blob): Promise<AudioTags> {
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (ascii(head, 0, 3) !== 'ID3') return {};
    const ver = head[3];
    const flags = head[5];
    const size = syncsafe(head, 6);
    if (ver < 2 || ver > 4 || size <= 0 || size > 30_000_000) return {};
    let buf: Uint8Array = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
    if (flags & 0x80 && ver < 4) buf = resync(buf);
    let off = 0;
    if (flags & 0x40 && ver >= 3) off = ver === 4 ? syncsafe(buf, 0) : u32(buf, 0) + 4;

    const tags: AudioTags = {};
    let coverType = -1;
    const text = (d: Uint8Array) => decode(d.subarray(1), d[0]) || undefined;
    while (off < buf.length) {
      const v22 = ver === 2;
      const hdr = v22 ? 6 : 10;
      if (off + hdr > buf.length) break;
      const id = ascii(buf, off, v22 ? 3 : 4);
      if (!/^[A-Z0-9]{3,4}$/.test(id)) break; // padding
      const fsize = v22 ? (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5] : ver === 4 ? syncsafe(buf, off + 4) : u32(buf, off + 4);
      if (fsize <= 0 || off + hdr + fsize > buf.length) break;
      let data: Uint8Array = buf.subarray(off + hdr, off + hdr + fsize);
      if (ver === 4 && buf[off + 9] & 0x02) data = resync(data);
      off += hdr + fsize;
      switch (id) {
        case 'TIT2': case 'TT2': tags.title ||= text(data); break;
        case 'TPE1': case 'TP1': tags.artist ||= text(data); break;
        case 'TALB': case 'TAL': tags.album ||= text(data); break;
        case 'TCOM': case 'TCM': tags.composer ||= text(data); break;
        case 'TEXT': case 'TXT': tags.lyricist ||= text(data); break;
        case 'TYER': case 'TYE': case 'TDRC': case 'TDRL': {
          const y = Number((text(data) || '').slice(0, 4));
          if (!tags.year && y > 1900 && y < 2100) tags.year = y;
          break;
        }
        case 'APIC': case 'PIC': {
          const pic = picture(data, v22);
          if (pic && (coverType < 0 || (pic.type === 3 && coverType !== 3))) {
            tags.picture = pic.blob;
            coverType = pic.type;
          }
          break;
        }
      }
    }
    return tags;
  } catch {
    return {};
  }
}

/** Duration in seconds, as the browser decodes it (0 when it can't play the format). */
export function audioDuration(file: Blob): Promise<number> {
  return new Promise((res) => {
    const a = document.createElement('audio');
    const url = URL.createObjectURL(file);
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      a.removeAttribute('src');
      res(Number.isFinite(d) ? d : 0);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
    a.src = url;
  });
}

/** Square JPEG cover, centre-cropped, at most `size` px. */
export async function squareJpeg(img: Blob, size = 800): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(img);
    const side = Math.min(bmp.width, bmp.height);
    const out = Math.min(size, side);
    const c = document.createElement('canvas');
    c.width = c.height = out;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
    bmp.close();
    return await new Promise((r) => c.toBlob((b) => r(b), 'image/jpeg', 0.88));
  } catch {
    return null;
  }
}

/** "03 - Zubeen Garg - Mayabini (Official Audio).mp3" -> "Mayabini" */
export function titleFromName(name: string): string {
  return name
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/^\s*\d{1,3}\s*[-.)]\s*/, '')
    .replace(/\b(zubeen\s*garg|zubin\s*garg)\b\s*[-–:]?\s*/gi, '')
    .replace(/[([](official|lyric|lyrical|full|audio|video|hd|hq|320\s*kbps|mp3)[^)\]]*[)\]]/gi, '')
    .replace(/\s*[-–]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
