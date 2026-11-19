'use client';
import { create } from 'zustand';
import type { Library, Playlist, RecentContext } from '@/lib/types';
import { toast } from './ui';

interface LibState extends Library {
  loaded: boolean;
  liked: Set<number>;
  load: () => Promise<void>;
  toggleLike: (id: number, on?: boolean) => void;
  createPlaylist: (name?: string, songs?: number[]) => Promise<Playlist | null>;
  addToPlaylist: (pid: string, ids: number[]) => Promise<void>;
  removeFromPlaylist: (pid: string, ids: number[]) => Promise<void>;
  updatePlaylist: (pid: string, patch: { name?: string; desc?: string; order?: number[] }) => Promise<void>;
  deletePlaylist: (pid: string) => Promise<void>;
  recordPlay: (id: number, ctx?: Partial<RecentContext>) => void;
  clearHistory: () => Promise<void>;
}

const json = (r: Response) => {
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);

export const useLibrary = create<LibState>()((set, get) => ({
  likes: [],
  playlists: [],
  history: [],
  recents: [],
  loaded: false,
  liked: new Set(),
  load: async () => {
    try {
      const lib = (await fetch('/api/library', { cache: 'no-store' }).then(json)) as Library;
      set({ ...lib, liked: new Set(lib.likes.map((l) => l.id)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  toggleLike: (id, on) => {
    const was = get().liked.has(id);
    const next = on ?? !was;
    if (next === was) return;
    const likes = next ? [{ id, at: Date.now() }, ...get().likes] : get().likes.filter((l) => l.id !== id);
    set({ likes, liked: new Set(likes.map((l) => l.id)) });
    toast(next ? 'Added to Liked Songs.' : 'Removed from Liked Songs.');
    send('/api/library/likes', 'POST', { id, on: next }).catch(() => {
      toast('Could not save that. Is the server running?');
    });
  },
  createPlaylist: async (name, songs = []) => {
    try {
      const p = (await send('/api/library/playlists', 'POST', { name, songs })) as Playlist;
      set({ playlists: [p, ...get().playlists] });
      return p;
    } catch {
      toast('Could not create the playlist.');
      return null;
    }
  },
  addToPlaylist: async (pid, ids) => {
    const p = get().playlists.find((x) => x.id === pid);
    if (!p) return;
    const have = new Set(p.songs.map((s) => s.id));
    const fresh = ids.filter((i) => !have.has(i));
    if (!fresh.length) {
      toast(`Already in ${p.name}.`);
      return;
    }
    try {
      const np = (await send(`/api/library/playlists/${pid}`, 'PATCH', { add: fresh })) as Playlist;
      set({ playlists: get().playlists.map((x) => (x.id === pid ? np : x)) });
      toast(`Added to ${np.name}.`);
    } catch {
      toast('Could not add to the playlist.');
    }
  },
  removeFromPlaylist: async (pid, ids) => {
    try {
      const np = (await send(`/api/library/playlists/${pid}`, 'PATCH', { remove: ids })) as Playlist;
      set({ playlists: get().playlists.map((x) => (x.id === pid ? np : x)) });
      toast(`Removed from ${np.name}.`);
    } catch {
      toast('Could not update the playlist.');
    }
  },
  updatePlaylist: async (pid, patch) => {
    try {
      const np = (await send(`/api/library/playlists/${pid}`, 'PATCH', patch)) as Playlist;
      set({ playlists: get().playlists.map((x) => (x.id === pid ? np : x)) });
    } catch {
      toast('Could not update the playlist.');
    }
  },
  deletePlaylist: async (pid) => {
    const p = get().playlists.find((x) => x.id === pid);
    set({ playlists: get().playlists.filter((x) => x.id !== pid) });
    try {
      await send(`/api/library/playlists/${pid}`, 'DELETE');
      if (p) toast(`Deleted ${p.name}.`);
    } catch {
      toast('Could not delete the playlist.');
    }
  },
  recordPlay: (id, ctx) => {
    const now = Date.now();
    const history = [{ id, at: now }, ...get().history].slice(0, 300);
    let recents = get().recents;
    if (ctx?.href) {
      recents = [{ href: ctx.href, label: ctx.label || '', sub: ctx.sub || '', img: ctx.img || '', kind: ctx.kind || '', at: now }, ...recents.filter((r) => r.href !== ctx.href)].slice(0, 24);
    }
    set({ history, recents });
    send('/api/library/history', 'POST', { id, ctx }).catch(() => undefined);
  },
  clearHistory: async () => {
    set({ history: [], recents: [] });
    await send('/api/library', 'DELETE').catch(() => undefined);
    toast('Listening history cleared.');
  },
}));
