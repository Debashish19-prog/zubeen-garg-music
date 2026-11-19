'use client';
import { create } from 'zustand';
import type { Song } from '@/lib/types';
import { prime, setTgOverlay, withTg } from '@/lib/client/songCache';
import { usePlayer } from './player';

export interface TgStatus {
  configured: boolean;
  connected: boolean;
  error: string;
  me: { name: string; username?: string } | null;
  channel: string | null;
  login: { step: 'code' | 'password'; phone: string; hint: string; viaApp: boolean } | null;
}

export interface OwnerUpload {
  key: string;
  id: number;
  cat: boolean;
  size: number;
  mime: string;
  fileName: string;
  d: number;
  at: number;
  song: Song | null;
}

interface OwnerState {
  /** the site owner is signed in on this browser (only they see the upload tools) */
  owner: boolean;
  checked: boolean;
  /** uploads need the owner password (false while OWNER_PASSWORD is unset on the server) */
  auth: boolean;
  configured: boolean;
  tg: TgStatus | null;
  /** song ids of every upload, newest first (public) */
  uploadIds: number[];
  /** bumps whenever the uploads overlay changes, so lists re-read `tg` */
  overlayVersion: number;
  /** the upload dialog; `files` are files dropped elsewhere that it should pick up */
  dialog: { open: boolean; attach: Song | null; files: File[] };

  load: () => Promise<void>;
  refreshUploads: () => Promise<void>;
  signIn: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshTg: () => Promise<TgStatus | null>;
  tgAction: (body: Record<string, string>) => Promise<{ error?: string; resync?: { added: number; removed: number; total: number } }>;
  tgSignOut: () => Promise<void>;
  openUpload: (attach?: Song | null, files?: File[]) => void;
  closeUpload: () => void;
}

async function json<T>(r: Response): Promise<T> {
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}

export const useOwner = create<OwnerState>()((set, get) => ({
  owner: false,
  checked: false,
  auth: false,
  configured: true,
  tg: null,
  uploadIds: [],
  overlayVersion: 0,
  dialog: { open: false, attach: null, files: [] },

  load: async () => {
    void get().refreshUploads();
    try {
      const r = await json<{ owner: boolean; auth: boolean; configured: boolean }>(await fetch('/api/owner', { cache: 'no-store' }));
      set({ owner: r.owner, auth: r.auth, configured: r.configured, checked: true });
      if (r.owner) void get().refreshTg();
    } catch {
      set({ checked: true });
    }
  },

  refreshUploads: async () => {
    try {
      const r = await json<{ ids: number[]; tg: Record<number, string>; songs: Song[] }>(await fetch('/api/uploads', { cache: 'no-store' }));
      setTgOverlay(r.tg);
      prime(r.songs);
      set((s) => ({ uploadIds: r.ids, overlayVersion: s.overlayVersion + 1 }));
      // the song that's loaded in the player may have just gained (or lost) its file
      const p = usePlayer.getState();
      if (p.current) {
        const extra = r.songs.find((x) => x.id === p.current!.id);
        const next = extra ?? withTg(p.current);
        if (next.tg !== p.current.tg) usePlayer.getState()._refreshCurrent(next);
      }
    } catch {
      /* offline: keep what we have */
    }
  },

  signIn: async (password) => {
    try {
      await json(await fetch('/api/owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }));
      set({ owner: true });
      void get().refreshTg();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  },

  signOut: async () => {
    await fetch('/api/owner', { method: 'DELETE' }).catch(() => undefined);
    set({ owner: false, tg: null, dialog: { open: false, attach: null, files: [] } });
  },

  refreshTg: async () => {
    try {
      const tg = await json<TgStatus>(await fetch('/api/telegram', { cache: 'no-store' }));
      set({ tg });
      return tg;
    } catch {
      return null;
    }
  },

  tgAction: async (body) => {
    try {
      const r = await json<TgStatus & { resync?: { added: number; removed: number; total: number } }>(
        await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      );
      set({ tg: r });
      if (r.resync) void get().refreshUploads();
      return { resync: r.resync };
    } catch (e) {
      void get().refreshTg();
      return { error: (e as Error).message };
    }
  },

  tgSignOut: async () => {
    const tg = await fetch('/api/telegram', { method: 'DELETE' })
      .then((r) => json<TgStatus>(r))
      .catch(() => null);
    set({ tg });
  },

  openUpload: (attach = null, files = []) => set({ dialog: { open: true, attach, files } }),
  closeUpload: () => set((s) => ({ dialog: { ...s.dialog, open: false } })),
}));

/** Re-render a component when the uploads overlay changes. */
export const useOverlayVersion = () => useOwner((s) => s.overlayVersion);
