import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Library, Playlist, RecentContext } from '@/lib/types';
import { songAt } from './catalog';

/**
 * The listener's own library (liked songs, playlists, play history), kept in data/library.json.
 * Single-user and local: one JSON file, written atomically, with writes serialised.
 */
const FILE = path.join(process.cwd(), 'data', 'library.json');
const EMPTY: Library = { likes: [], playlists: [], history: [], recents: [] };

const g = globalThis as unknown as { __zgLib?: Library; __zgLibQ?: Promise<unknown> };

function read(): Library {
  if (g.__zgLib) return g.__zgLib;
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<Library>;
    g.__zgLib = { ...EMPTY, ...d };
  } catch {
    g.__zgLib = structuredClone(EMPTY);
  }
  return g.__zgLib!;
}

async function write(lib: Library) {
  const tmp = FILE + '.' + process.pid + '.tmp';
  await fs.promises.mkdir(path.dirname(FILE), { recursive: true });
  await fs.promises.writeFile(tmp, JSON.stringify(lib));
  await fs.promises.rename(tmp, FILE);
}

/** Run a mutation against the library and persist it; mutations run one at a time. */
export function mutate<T>(fn: (lib: Library) => T): Promise<T> {
  const run = async () => {
    const lib = read();
    const out = fn(lib);
    await write(lib);
    return out;
  };
  const p = (g.__zgLibQ ?? Promise.resolve()).then(run, run);
  g.__zgLibQ = p.catch(() => undefined);
  return p;
}

export const getLibrary = (): Library => read();

const validSong = (id: unknown): id is number => Number.isInteger(id) && !!songAt(id as number);

export function setLike(id: number, on: boolean) {
  return mutate((lib) => {
    if (!validSong(id)) throw new Error('unknown song');
    lib.likes = lib.likes.filter((x) => x.id !== id);
    if (on) lib.likes.unshift({ id, at: Date.now() });
    return lib.likes;
  });
}

export function createPlaylist(name?: string, songs: number[] = []) {
  return mutate((lib) => {
    const n = lib.playlists.length + 1;
    const now = Date.now();
    const p: Playlist = {
      id: crypto.randomUUID().slice(0, 8),
      name: (name || `My Playlist #${n}`).slice(0, 100),
      desc: '',
      songs: songs.filter(validSong).map((id) => ({ id, at: now })),
      createdAt: now,
      updatedAt: now,
    };
    lib.playlists.unshift(p);
    return p;
  });
}

export interface PlaylistPatch {
  name?: string;
  desc?: string;
  add?: number[];
  remove?: number[];
  order?: number[];
}

export function patchPlaylist(id: string, patch: PlaylistPatch) {
  return mutate((lib) => {
    const p = lib.playlists.find((x) => x.id === id);
    if (!p) throw new Error('not found');
    if (typeof patch.name === 'string' && patch.name.trim()) p.name = patch.name.trim().slice(0, 100);
    if (typeof patch.desc === 'string') p.desc = patch.desc.slice(0, 300);
    if (patch.add?.length) {
      const have = new Set(p.songs.map((s) => s.id));
      const now = Date.now();
      for (const sid of patch.add) if (validSong(sid) && !have.has(sid)) { p.songs.push({ id: sid, at: now }); have.add(sid); }
    }
    if (patch.remove?.length) {
      const rm = new Set(patch.remove);
      p.songs = p.songs.filter((s) => !rm.has(s.id));
    }
    if (patch.order?.length) {
      const byId = new Map(p.songs.map((s) => [s.id, s]));
      const next = patch.order.map((sid) => byId.get(sid)).filter(Boolean) as Playlist['songs'];
      if (next.length === p.songs.length) p.songs = next;
    }
    p.updatedAt = Date.now();
    return p;
  });
}

export function deletePlaylist(id: string) {
  return mutate((lib) => {
    lib.playlists = lib.playlists.filter((x) => x.id !== id);
    return true;
  });
}

export function recordPlay(id: number, ctx?: Partial<RecentContext>) {
  return mutate((lib) => {
    if (!validSong(id)) throw new Error('unknown song');
    const now = Date.now();
    lib.history.unshift({ id, at: now });
    lib.history = lib.history.slice(0, 300);
    if (ctx?.href && typeof ctx.href === 'string' && ctx.href.startsWith('/')) {
      lib.recents = lib.recents.filter((r) => r.href !== ctx.href);
      lib.recents.unshift({
        href: ctx.href.slice(0, 300),
        label: String(ctx.label || '').slice(0, 120),
        sub: String(ctx.sub || '').slice(0, 120),
        img: String(ctx.img || '').slice(0, 500),
        kind: String(ctx.kind || '').slice(0, 30),
        at: now,
      });
      lib.recents = lib.recents.slice(0, 24);
    }
    return true;
  });
}

export function clearHistory() {
  return mutate((lib) => {
    lib.history = [];
    lib.recents = [];
    return true;
  });
}
