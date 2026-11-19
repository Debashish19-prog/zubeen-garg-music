import fs from 'node:fs';
import path from 'node:path';

/**
 * Index of the songs the owner uploaded to Telegram, kept in data/uploads.json. The audio itself
 * lives only in Telegram; each message's caption repeats this record, so the index can be rebuilt
 * from the channel ("Re-sync from Telegram") if this file is ever lost.
 */
import { UPLOAD_BASE } from '@/lib/meta';
export { UPLOAD_BASE };

export interface UploadRec {
  /** url-safe id used in /api/stream/<key> */
  key: string;
  /** song id: a catalogue song, or UPLOAD_BASE + n for a song that isn't in the catalogue */
  id: number;
  /** true when the file was attached to an existing catalogue song */
  cat: boolean;
  msgId: number;
  coverMsgId?: number;
  size: number;
  mime: string;
  fileName: string;
  /** duration, seconds */
  d: number;
  at: number;
  /* details for songs that aren't in the catalogue */
  t?: string;
  an?: string;
  l?: string;
  y?: number;
  c?: string;
  m?: string;
  w?: string;
}

interface Store {
  next: number;
  items: UploadRec[];
}

const FILE = path.join(process.cwd(), 'data', 'uploads.json');
const g = globalThis as unknown as { __zgUploads?: Store; __zgUploadsQ?: Promise<unknown> };

function read(): Store {
  if (g.__zgUploads) return g.__zgUploads;
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<Store>;
    g.__zgUploads = { next: d.next ?? UPLOAD_BASE, items: Array.isArray(d.items) ? d.items : [] };
  } catch {
    g.__zgUploads = { next: UPLOAD_BASE, items: [] };
  }
  return g.__zgUploads!;
}

export const uploadsSnapshot = (): readonly UploadRec[] => read().items;
export const uploadByKey = (key: string) => read().items.find((r) => r.key === key);

/** Run a change against the index and save it; changes run one at a time. */
export function mutateUploads<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const s = read();
    const out = await fn(s);
    await fs.promises.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = FILE + '.' + process.pid + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(s, null, 1));
    await fs.promises.rename(tmp, FILE);
    return out;
  };
  const p = (g.__zgUploadsQ ?? Promise.resolve()).then(run, run);
  g.__zgUploadsQ = p.catch(() => undefined);
  return p;
}

export const streamUrl = (r: Pick<UploadRec, 'key'>) => `/api/stream/${r.key}`;
export const coverUrl = (r: Pick<UploadRec, 'key' | 'coverMsgId'>) => (r.coverMsgId ? `/api/cover/${r.key}` : '');

/* ---- captions: a readable first line, then the record as JSON after a tag ---- */

const TAG = '#zubeen ';

export function encodeCaption(r: UploadRec, title: string, album: string): string {
  const { key, id, cat, coverMsgId, d, t, an, l, y, c, m, w } = r;
  const head = `🎵 ${title}${album ? ' · ' + album : ''}${r.y ? ' (' + r.y + ')' : ''}`;
  const meta = JSON.stringify({ v: 1, key, id, cat, cv: coverMsgId, d: Math.round(d), t, an, l, y, c, m, w });
  return `${head.slice(0, 200)}\n${TAG}${meta}`.slice(0, 1024);
}

export function decodeCaption(caption: string): (Partial<UploadRec> & { cv?: number }) | null {
  const at = caption.indexOf(TAG);
  if (at < 0) return null;
  try {
    const o = JSON.parse(caption.slice(at + TAG.length)) as Partial<UploadRec> & { v?: number; cv?: number };
    return o.v === 1 && typeof o.key === 'string' ? o : null;
  } catch {
    return null;
  }
}
