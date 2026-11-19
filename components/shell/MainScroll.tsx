'use client';
import { createContext, useContext, useEffect, type RefObject } from 'react';
import { useMotionValue } from 'motion/react';

/** The main panel is the scroll container (not the window), like the Spotify desktop app. */
export const MainScrollContext = createContext<RefObject<HTMLElement | null>>({ current: null });
export const useMainScroll = () => useContext(MainScrollContext);

/** scrollTop of the main panel as a MotionValue (subscribed after mount, so the ref is always set). */
export function useMainScrollY() {
  const ref = useMainScroll();
  const y = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => y.set(el.scrollTop);
    on();
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [ref, y]);
  return y;
}
