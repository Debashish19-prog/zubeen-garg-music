import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { hashColor, hslToHex } from '@/lib/text';

/**
 * Dominant, slightly muted colour of an artwork, for Spotify-style gradient headers.
 * Only artwork from the catalogue's CDNs or the local /photos folder is fetched (no open proxy).
 */
const ALLOWED = [/^https:\/\/c\.saavncdn\.com\//, /^https:\/\/[a-z0-9-]+\.mzstatic\.com\//, /^https:\/\/i\.scdn\.co\//, /^https:\/\/i\.ytimg\.com\//];
const FILE = path.join(process.cwd(), 'data', 'colors.json');

const g = globalThis as unknown as { __zgColors?: Map<string, string>; __zgColorsDirty?: NodeJS.Timeout | null };
const cache: Map<string, string> =
  g.__zgColors ??
  (g.__zgColors = (() => {
    try {
      return new Map(Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, string>));
    } catch {
      return new Map<string, string>();
    }
  })());
const inflight = new Map<string, Promise<string>>();

function persistSoon() {
  if (g.__zgColorsDirty) return;
  g.__zgColorsDirty = setTimeout(() => {
    g.__zgColorsDirty = null;
    try {
      const tmp = FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(cache)));
      fs.renameSync(tmp, FILE);
    } catch {
      /* cache is best-effort */
    }
  }, 1500);
}

const UPLOAD_COVER = /^\/api\/cover\/([A-Za-z0-9_-]+)$/;
export const isAllowedArt = (src: string) => (src.startsWith('/photos/') ? !src.includes('..') : UPLOAD_COVER.test(src) || ALLOWED.some((r) => r.test(src)));

async function readArt(src: string): Promise<Buffer> {
  const up = UPLOAD_COVER.exec(src);
  if (up) return (await import('./uploads')).coverBytes(up[1]);
  if (src.startsWith('/photos/')) return fs.promises.readFile(path.join(process.cwd(), 'public', src));
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(src, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (zubeen-music color sampler)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const len = Number(r.headers.get('content-length') || 0);
    if (len > 8_000_000) throw new Error('too large');
    return Buffer.from(await r.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

async function compute(src: string): Promise<string> {
  const buf = await readArt(src);
  const { data, info } = await sharp(buf).resize(28, 28, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0, l: 0 }));
  let tw = 0, tl = 0, ts = 0;
  for (let p = 0; p < info.width * info.height; p++) {
    const [h, s, l] = rgbToHsl(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
    tl += l; ts += s; tw++;
    if (l < 0.08 || l > 0.94) continue;
    const w = s * s * (1 - Math.abs(l - 0.5) * 1.4) + 0.002;
    const b = buckets[Math.floor(h / 30) % 12];
    b.w += w; b.h += h * w; b.s += s * w; b.l += l * w;
  }
  const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w < 0.6 || ts / tw < 0.1) {
    // greyscale-ish artwork: a neutral, gently tinted grey
    const L = Math.min(0.36, Math.max(0.2, tl / tw * 0.6));
    return hslToHex(best.w ? best.h / best.w : 220, 0.08, L);
  }
  const h = best.h / best.w, s = best.s / best.w, l = best.l / best.w;
  return hslToHex(h, Math.min(0.62, Math.max(0.25, s * 0.85)), Math.min(0.4, Math.max(0.24, l * 0.75)));
}

export async function colorOf(src: string | undefined | null, fallbackKey = ''): Promise<string> {
  if (!src || !isAllowedArt(src)) return hashColor(fallbackKey || src || 'zubeen');
  const hit = cache.get(src);
  if (hit) return hit;
  let p = inflight.get(src);
  if (!p) {
    p = compute(src)
      .catch(() => hashColor(fallbackKey || src))
      .then((c) => {
        cache.set(src, c);
        inflight.delete(src);
        persistSoon();
        return c;
      });
    inflight.set(src, p);
  }
  return p;
}

/** Colour, but give up after `ms` so a slow CDN never blocks a page render. */
export function colorOfFast(src: string | undefined | null, fallbackKey = '', ms = 1200): Promise<string> {
  return Promise.race([colorOf(src, fallbackKey), new Promise<string>((r) => setTimeout(() => r(hashColor(fallbackKey || src || 'zubeen')), ms))]);
}
