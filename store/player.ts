'use client';
import { create } from 'zustand';
import type { PlayContext, Song, SourceKey } from '@/lib/types';
import { SRC_INFO, isPlayable, sourcesOf } from '@/lib/meta';
import { getSong, getSongs, withTg } from '@/lib/client/songCache';
import { local } from '@/lib/client/storage';
import { toast, useUI } from './ui';
import { useLibrary } from './library';

export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'external';

/** Implemented by <PlayerEngine/>, which owns the <audio> (uploads and previews), YouTube, Spotify and JioSaavn players. */
export interface Engine {
  load(song: Song, src: SourceKey, ytId: string): void;
  play(): void;
  pause(): void;
  seek(t: number): void;
  setVolume(v: number): void;
  stop(): void;
}
let engine: Engine | null = null;
export const registerEngine = (e: Engine | null) => {
  engine = e;
};

export const VISUAL: SourceKey[] = ['yt', 'sp', 'sa'];

interface PlayerState {
  queue: number[];
  order: number[];
  pos: number;
  shuffle: boolean;
  repeat: 0 | 1 | 2;
  current: Song | null;
  source: SourceKey | null;
  sources: SourceKey[];
  status: Status;
  time: number;
  duration: number;
  /** performance.now() when `time` was last reported, so the progress bar can interpolate smoothly */
  stamp: number;
  volume: number;
  muted: boolean;
  preferFull: boolean;
  context: PlayContext | null;
  /** YouTube ids found by the backend resolver for songs that had none */
  yt: Record<number, string>;

  playList: (ids: number[], start?: number, ctx?: PlayContext | null, opts?: { shuffle?: boolean }) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setShuffle: (on: boolean) => void;
  cycleRepeat: () => void;
  playNext: (ids: number[]) => void;
  addToQueue: (ids: number[]) => void;
  jump: (orderPos: number) => void;
  removeAt: (orderPos: number) => void;
  reorderUpcoming: (slice: number[]) => void;
  clearUpcoming: () => void;
  useSource: (k: SourceKey) => void;
  setPreferFull: (on: boolean) => void;

  _progress: (t: number, d: number) => void;
  _status: (s: Status) => void;
  _ended: () => void;
  _error: (msg: string) => void;
  /** the loaded song's details changed (an upload was added or removed) */
  _refreshCurrent: (s: Song) => void;
}

let token = 0;
let resolverOn: boolean | null = null;
async function resolverEnabled() {
  if (resolverOn !== null) return resolverOn;
  try {
    resolverOn = !!(await fetch('/api/config').then((r) => r.json())).resolver;
  } catch {
    resolverOn = false;
  }
  return resolverOn;
}

function shuffled(n: number, first: number | null) {
  const o = Array.from({ length: n }, (_, k) => k).filter((k) => k !== first);
  for (let k = o.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [o[k], o[j]] = [o[j], o[k]];
  }
  return first == null ? o : [first, ...o];
}
const identity = (n: number) => Array.from({ length: n }, (_, k) => k);

export const usePlayer = create<PlayerState>()((set, get) => {
  /** the song with the latest uploaded file and any YouTube id the resolver found */
  const withSrc = (s: Song): Song => {
    const t = withTg(s);
    return t.yt || !get().yt[t.id] ? t : { ...t, yt: get().yt[t.id] };
  };
  const sourcesFor = (s: Song) => sourcesOf(withSrc(s), get().preferFull);
  const playableNow = (s: Song) => isPlayable(withSrc(s));

  function loadSource(k: SourceKey) {
    const s = get().current;
    if (!s) return;
    set({ source: k, status: k === 'sa' ? 'external' : 'loading', time: 0, duration: k === 'pv' ? 30 : s.d || 0, stamp: performance.now() });
    const ui = useUI.getState();
    if (k === 'sa' && ui.panel !== 'now' && !ui.fullscreen) ui.setPanel('now');
    const full = withSrc(s);
    engine?.load(full, k, full.yt);
    if (k === 'sa') toast(`Find “${s.t}” in the JioSaavn player and press play there.`);
  }

  async function startCurrent(skip: boolean, dir: 1 | -1) {
    const my = ++token;
    const { queue, order } = get();
    let pos = get().pos;
    void getSongs(order.slice(Math.max(0, pos - 2), pos + 40).map((k) => queue[k]));
    let song: Song | null = null;
    let guard = 0;
    while (pos >= 0 && pos < order.length && guard++ <= order.length) {
      const s = await getSong(queue[order[pos]]);
      if (my !== token) return;
      if (s && (!skip || playableNow(s))) {
        song = s;
        break;
      }
      pos += dir;
    }
    if (!song) {
      engine?.stop();
      set({ status: 'idle', source: null });
      toast('End of the queue.');
      return;
    }
    set({ pos, current: song, time: 0, duration: song.d || 0, stamp: performance.now(), status: 'loading', source: null, sources: [] });
    persistSoon();

    if (!song.yt && !withTg(song).tg && !(song.id in get().yt) && (await resolverEnabled())) {
      try {
        const r = await fetch(`/api/resolve?id=${song.id}`, { signal: AbortSignal.timeout(5000) }).then((x) => x.json());
        set((st) => ({ yt: { ...st.yt, [song!.id]: r.yt || '' } }));
      } catch {
        /* fall back to the other players */
      }
      if (my !== token) return;
    }
    const sources = sourcesFor(song);
    set({ sources });
    if (!sources.length) {
      engine?.stop();
      set({ status: 'idle', source: null });
      toast(`No free player for “${song.t}”. Its links are in the Now Playing view.`);
      useUI.getState().setPanel('now');
      return;
    }
    loadSource(sources[0]);
    const ctx = get().context;
    useLibrary.getState().recordPlay(song.id, ctx?.href ? { href: ctx.href, label: ctx.label, sub: ctx.kind || '', img: ctx.img || '', kind: ctx.kind || '' } : undefined);
  }

  let persistT: ReturnType<typeof setTimeout> | null = null;
  function persistSoon() {
    if (persistT) clearTimeout(persistT);
    persistT = setTimeout(() => {
      const { queue, order, pos, context, shuffle, repeat } = get();
      if (queue.length > 3000) {
        // keep a window around the current song
        const ids = order.slice(Math.max(0, pos - 50), pos + 2000).map((k) => queue[k]);
        local.set('session', { queue: ids, order: identity(ids.length), pos: Math.min(pos, 50), context, shuffle, repeat });
      } else local.set('session', { queue, order, pos, context, shuffle, repeat });
    }, 400);
  }

  return {
    queue: [],
    order: [],
    pos: -1,
    shuffle: false,
    repeat: 0,
    current: null,
    source: null,
    sources: [],
    status: 'idle',
    time: 0,
    duration: 0,
    stamp: 0,
    volume: 0.85,
    muted: false,
    preferFull: false,
    context: null,
    yt: {},

    playList: (ids, start = 0, ctx = null, opts = {}) => {
      if (!ids.length) return;
      const shuffle = opts.shuffle ?? get().shuffle;
      if (opts.shuffle !== undefined) local.set('shuffle', shuffle);
      if (opts.shuffle && start === 0) start = Math.floor(Math.random() * ids.length);
      const order = shuffle ? shuffled(ids.length, start) : identity(ids.length);
      set({ queue: ids.slice(), order, pos: shuffle ? 0 : start, context: ctx, shuffle });
      void startCurrent(start === 0 || !!opts.shuffle, 1);
    },
    toggle: () => {
      const { status } = get();
      if (status === 'playing' || status === 'loading') get().pause();
      else get().play();
    },
    play: () => {
      const { current, source } = get();
      if (!current) return;
      if (!source) {
        const srcs = sourcesFor(current);
        set({ sources: srcs });
        if (srcs.length) loadSource(srcs[0]);
        else void startCurrent(false, 1);
        return;
      }
      if (source === 'sa') {
        toast('Use the play button inside the JioSaavn player.');
        useUI.getState().setPanel('now');
        return;
      }
      engine?.play();
    },
    pause: () => {
      if (get().source === 'sa') return;
      engine?.pause();
      set({ status: 'paused' });
    },
    next: (auto = false) => {
      const { order, pos, repeat } = get();
      if (!order.length) return;
      if (pos >= order.length - 1) {
        if (repeat === 1) {
          set({ pos: 0 });
          void startCurrent(true, 1);
        } else if (auto) {
          set({ status: 'paused' });
          toast('End of the queue.');
        } else toast('That was the last song in the queue.');
        return;
      }
      set({ pos: pos + 1 });
      void startCurrent(true, 1);
    },
    prev: () => {
      const { time, source, pos } = get();
      if (time > 3 && source && source !== 'sa') return get().seek(0);
      if (pos > 0) {
        set({ pos: pos - 1 });
        void startCurrent(true, -1);
      } else get().seek(0);
    },
    seek: (t) => {
      const { source, duration } = get();
      if (!source || source === 'sa' || !duration) return;
      t = Math.max(0, Math.min(duration - 0.25, t));
      engine?.seek(t);
      set({ time: t, stamp: performance.now() });
    },
    setVolume: (v) => {
      v = Math.max(0, Math.min(1, v));
      set({ volume: v, muted: v === 0 });
      engine?.setVolume(v);
      local.set('volume', v);
    },
    toggleMute: () => {
      const muted = !get().muted;
      const v = muted ? 0 : get().volume || 0.5;
      set({ muted, volume: get().volume || 0.5 });
      engine?.setVolume(v);
    },
    setShuffle: (on) => {
      const { queue, order, pos } = get();
      local.set('shuffle', on);
      if (!queue.length) return set({ shuffle: on });
      const cur = order[pos];
      if (on) set({ shuffle: on, order: shuffled(queue.length, cur), pos: 0 });
      else set({ shuffle: on, order: identity(queue.length), pos: cur });
      persistSoon();
    },
    cycleRepeat: () => {
      const repeat = ((get().repeat + 1) % 3) as 0 | 1 | 2;
      set({ repeat });
      local.set('repeat', repeat);
      toast(['Repeat off.', 'Repeating the queue.', 'Repeating this song.'][repeat]);
    },
    playNext: (ids) => {
      if (!get().queue.length) return get().playList(ids, 0, null);
      const { queue, order, pos } = get();
      const start = queue.length;
      const nq = [...queue, ...ids];
      const no = order.slice();
      no.splice(pos + 1, 0, ...ids.map((_, k) => start + k));
      set({ queue: nq, order: no });
      void getSongs(ids);
      toast(ids.length === 1 ? 'Plays next.' : `${ids.length} songs play next.`);
      persistSoon();
    },
    addToQueue: (ids) => {
      if (!get().queue.length) return get().playList(ids, 0, null);
      const { queue, order } = get();
      const start = queue.length;
      set({ queue: [...queue, ...ids], order: [...order, ...ids.map((_, k) => start + k)] });
      void getSongs(ids);
      toast(ids.length === 1 ? 'Added to queue.' : `Added ${ids.length} songs to the queue.`);
      persistSoon();
    },
    jump: (orderPos) => {
      set({ pos: orderPos });
      void startCurrent(false, 1);
    },
    removeAt: (orderPos) => {
      const { order, pos } = get();
      if (orderPos <= pos) return;
      const no = order.slice();
      no.splice(orderPos, 1);
      set({ order: no });
      persistSoon();
    },
    reorderUpcoming: (slice) => {
      const { order, pos } = get();
      set({ order: [...order.slice(0, pos + 1), ...slice, ...order.slice(pos + 1 + slice.length)] });
      persistSoon();
    },
    clearUpcoming: () => {
      const { order, pos } = get();
      set({ order: order.slice(0, pos + 1) });
      toast('Cleared the rest of the queue.');
      persistSoon();
    },
    useSource: (k) => {
      if (!get().current) return;
      loadSource(k);
    },
    setPreferFull: (on) => {
      set({ preferFull: on });
      local.set('preferFull', on);
      const c = get().current;
      if (c) set({ sources: sourcesFor(c) });
      toast(on ? 'Full-length players now come first.' : 'Previews come first again, so songs move on by themselves.');
    },

    _progress: (t, d) => set({ time: t, duration: d || get().duration, stamp: performance.now() }),
    _status: (status) => set({ status, stamp: performance.now() }),
    _ended: () => {
      if (get().repeat === 2) {
        get().seek(0);
        engine?.play();
        return;
      }
      get().next(true);
    },
    _error: (msg) => {
      const { sources, source } = get();
      const k = source ? sources.indexOf(source) : -1;
      if (k >= 0 && k < sources.length - 1) {
        toast(`${msg} Trying ${SRC_INFO[sources[k + 1]].short} instead.`);
        loadSource(sources[k + 1]);
        return;
      }
      toast(`${msg} Skipping to the next song.`);
      const my = token;
      setTimeout(() => {
        if (my === token) get().next(true);
      }, 1200);
    },
    _refreshCurrent: (s) => {
      const cur = get().current;
      if (!cur || cur.id !== s.id) return;
      set({ current: s, sources: sourcesFor(s) });
    },
  };
});

/** Restore preferences and the last session (paused), Spotify-style. Call once after hydration. */
export async function restorePlayer() {
  const volume = local.get('volume', 0.85);
  usePlayer.setState({ volume, preferFull: local.get('preferFull', false), shuffle: local.get('shuffle', false), repeat: local.get('repeat', 0) as 0 | 1 | 2 });
  engine?.setVolume(volume);
  const s = local.get<{ queue: number[]; order: number[]; pos: number; context: PlayContext | null; shuffle: boolean; repeat: 0 | 1 | 2 } | null>('session', null);
  if (!s || !s.queue?.length || s.pos < 0 || s.pos >= s.order.length) return;
  const cur = await getSong(s.queue[s.order[s.pos]]);
  if (!cur || usePlayer.getState().current) return;
  usePlayer.setState({ queue: s.queue, order: s.order, pos: s.pos, context: s.context, current: cur, status: 'paused', source: null, duration: cur.d || 0, time: 0 });
}

export const isVisualSource = (k: SourceKey | null) => !!k && VISUAL.includes(k);

/** Whether the media box (video or embed) is on screen. With "Hide video" on, YouTube songs play as audio only. */
export const showsMedia = (k: SourceKey | null, hideVideo: boolean) => isVisualSource(k) && !(hideVideo && k === 'yt');
export const useShowsMedia = () => {
  const source = usePlayer((s) => s.source);
  const hideVideo = useUI((u) => u.hideVideo);
  return showsMedia(source, hideVideo);
};

/** Hide or show the YouTube video; the song keeps playing either way. */
export function toggleVideo() {
  const ui = useUI.getState();
  const hide = !ui.hideVideo;
  ui.setHideVideo(hide);
  if (usePlayer.getState().source === 'yt') toast(hide ? 'Video hidden. The song keeps playing.' : 'Showing the video.');
}
