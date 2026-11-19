export const norm = (s: string | null | undefined) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ঀ-৿ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Spelling-tolerant key: Xun/Hun, Mor/Mur, Zubeen/Zubin, Moyabini/Mayabini collapse to the same form. */
export const skel = (s: string) =>
  norm(s)
    .replace(/x/g, 'h')
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .replace(/v/g, 'b')
    .replace(/z/g, 'j')
    .replace(/[hw]/g, '')
    .replace(/[aou]/g, 'a')
    .replace(/[eiy]/g, 'i')
    .replace(/ /g, '')
    .replace(/(.)\1+/g, '$1');

export const hash = (s: string) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
};

export const fmt = (n: number) => n.toLocaleString('en-IN');

export const mmss = (t: number) => {
  t = Math.max(0, Math.floor(t || 0));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};

/** "1 hr 12 min" / "38 min" / "about 3 hr" */
export const longDuration = (sec: number, approx = false) => {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h >= 10) return `about ${h} hr`;
  if (h) return `${approx ? 'about ' : ''}${h} hr ${m} min`;
  return `${m} min`;
};

export const plural = (n: number, one: string, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;

/** Deterministic fallback colour for things without artwork. */
export const hashColor = (s: string) => {
  const h = hash(s) % 360;
  return hslToHex(h, 0.42, 0.3);
};

export function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + x(f(0)) + x(f(8)) + x(f(4));
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
