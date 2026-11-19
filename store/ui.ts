'use client';
import { create } from 'zustand';
import type { ReactNode } from 'react';
import { local } from '@/lib/client/storage';

export type Panel = 'now' | 'queue' | null;

export interface MenuItem {
  label?: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  external?: boolean;
  submenu?: MenuItem[];
  divider?: boolean;
  danger?: boolean;
  checked?: boolean;
  heading?: boolean;
}

interface Toast {
  id: number;
  msg: string;
}

interface UIState {
  panel: Panel;
  fullscreen: boolean;
  sidebarCollapsed: boolean;
  toasts: Toast[];
  menu: { x: number; y: number; items: MenuItem[]; key: number; anchor?: DOMRect } | null;
  editPlaylist: string | null;
  lightbox: number | null;
  mobileLibrary: boolean;
  /** Listen only: keep a YouTube song playing but don't show its video. */
  hideVideo: boolean;
  setPanel: (p: Panel) => void;
  togglePanel: (p: Exclude<Panel, null>) => void;
  setFullscreen: (on: boolean) => void;
  toggleSidebar: () => void;
  setHideVideo: (on: boolean) => void;
  toast: (msg: string) => void;
  dismissToast: (id: number) => void;
  openMenu: (x: number, y: number, items: MenuItem[], anchor?: DOMRect) => void;
  closeMenu: () => void;
  setEditPlaylist: (id: string | null) => void;
  setLightbox: (i: number | null) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>()((set, get) => ({
  panel: null,
  fullscreen: false,
  sidebarCollapsed: false,
  toasts: [],
  menu: null,
  editPlaylist: null,
  lightbox: null,
  mobileLibrary: false,
  hideVideo: false,
  setPanel: (panel) => {
    set({ panel });
    local.set('panel', panel);
  },
  togglePanel: (p) => get().setPanel(get().panel === p ? null : p),
  setFullscreen: (fullscreen) => {
    set({ fullscreen });
    try {
      if (fullscreen && !document.fullscreenElement && window.innerWidth > 760) document.documentElement.requestFullscreen?.().catch(() => undefined);
      if (!fullscreen && document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    } catch {
      /* not allowed */
    }
  },
  toggleSidebar: () => {
    const v = !get().sidebarCollapsed;
    set({ sidebarCollapsed: v });
    local.set('sidebarCollapsed', v);
  },
  setHideVideo: (hideVideo) => {
    set({ hideVideo });
    local.set('hideVideo', hideVideo);
  },
  toast: (msg) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, msg }] }));
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openMenu: (x, y, items, anchor) => set({ menu: { x, y, items, key: Date.now(), anchor } }),
  closeMenu: () => set({ menu: null }),
  setEditPlaylist: (editPlaylist) => set({ editPlaylist }),
  setLightbox: (lightbox) => set({ lightbox }),
}));

export const toast = (msg: string) => useUI.getState().toast(msg);

/** Restore per-viewer layout preferences after hydration. */
export function restoreUI() {
  useUI.setState({ panel: local.get<Panel>('panel', null), sidebarCollapsed: local.get('sidebarCollapsed', false), hideVideo: local.get('hideVideo', false) });
}
