'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePlayer } from '@/store/player';
import { hashColor } from '@/lib/text';

function mq(query: string) {
  return {
    subscribe(cb: () => void) {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}
const mobileQ = mq('(max-width: 767px)');
const coarseQ = mq('(pointer: coarse)');

export const useIsMobile = () => useSyncExternalStore(mobileQ.subscribe, mobileQ.get, () => false);
export const useCoarsePointer = () => useSyncExternalStore(coarseQ.subscribe, coarseQ.get, () => false);

/** Is this list/album/collection what the player is playing from, and is it playing right now? */
export function useContextState(key: string) {
  const isCtx = usePlayer((s) => s.context?.key === key && !!s.current);
  const playing = usePlayer((s) => s.context?.key === key && (s.status === 'playing' || s.status === 'loading' || s.status === 'external'));
  return { isCtx, playing };
}

const colorCache = new Map<string, string>();
/** Dominant colour of an artwork, computed by the backend (/api/color) and cached. */
export function useArtColor(src: string | undefined, fallbackKey: string) {
  const fb = hashColor(fallbackKey || src || 'zubeen');
  const [c, setC] = useState(() => (src && colorCache.get(src)) || fb);
  useEffect(() => {
    if (!src) {
      setC(fb);
      return;
    }
    const hit = colorCache.get(src);
    if (hit) {
      setC(hit);
      return;
    }
    let live = true;
    fetch('/api/color?src=' + encodeURIComponent(src))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.color) {
          colorCache.set(src, j.color);
          if (live) setC(j.color);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [src, fb]);
  return c;
}
