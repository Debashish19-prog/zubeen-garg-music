'use client';
import type { Song } from '@/lib/types';
import { UPLOAD_BASE } from '@/lib/meta';

/** Every song the browser has seen, by id. Lists and the player share it. */
const cache = new Map<number, Song>();
const inflight = new Map<number, Promise<void>>();

/**
 * Which catalogue songs have an uploaded file (id -> stream url), from /api/uploads. Pages can be
 * prerendered before an upload happened, so this map, not the page's copy, decides `tg`.
 */
let tgOverlay: Record<number, string> | null = null;

export function withTg<T extends Pick<Song, 'id' | 'tg'>>(s: T): T {
  if (!tgOverlay || s.id >= UPLOAD_BASE) return s;
  const tg = tgOverlay[s.id] || '';
  return (s.tg || '') === tg ? s : { ...s, tg };
}

export function setTgOverlay(map: Record<number, string>) {
  tgOverlay = map;
  for (const [id, s] of cache) if (id < UPLOAD_BASE) cache.set(id, withTg(s));
}

export const prime = (songs: Song[]) => songs.forEach((s) => cache.set(s.id, withTg(s)));
export const peek = (id: number) => cache.get(id);
export const forget = (id: number) => cache.delete(id);

export async function getSongs(ids: number[]): Promise<Song[]> {
  const missing = [...new Set(ids.filter((i) => !cache.has(i) && !inflight.has(i)))];
  for (let k = 0; k < missing.length; k += 400) {
    const chunk = missing.slice(k, k + 400);
    const p = fetch('/api/songs?ids=' + chunk.join(','))
      .then((r) => (r.ok ? r.json() : []))
      .then((songs: Song[]) => prime(songs))
      .catch(() => undefined)
      .finally(() => chunk.forEach((i) => inflight.delete(i)));
    chunk.forEach((i) => inflight.set(i, p));
  }
  await Promise.all(ids.map((i) => inflight.get(i)).filter(Boolean));
  return ids.map((i) => cache.get(i)).filter(Boolean) as Song[];
}

export async function getSong(id: number): Promise<Song | null> {
  return cache.get(id) ?? (await getSongs([id]))[0] ?? null;
}
