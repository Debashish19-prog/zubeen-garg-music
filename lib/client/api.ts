'use client';
import type { ListFilters, ListPayload, ListType } from '@/lib/types';
import { prime } from './songCache';

const idCache = new Map<string, number[]>();

/** All song ids for a list (album, collection, language...), fetched once and cached. */
export async function fetchListIds(type: ListType, key: string): Promise<number[]> {
  const k = type + ':' + key;
  const hit = idCache.get(k);
  if (hit) return hit;
  const p = await fetchList(type, key, {}, 40);
  idCache.set(k, p.ids);
  return p.ids;
}

export async function fetchList(type: ListType, key: string, f: ListFilters, first = 100): Promise<ListPayload> {
  const q = new URLSearchParams({ type, key, first: String(first) });
  for (const [a, b] of Object.entries(f)) if (b) q.set(a, String(b));
  const r = await fetch('/api/list?' + q.toString());
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const p = (await r.json()) as ListPayload;
  prime(p.songs);
  return p;
}
