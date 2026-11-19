'use client';
import { useCallback, useRef } from 'react';

/**
 * The YouTube / Spotify / JioSaavn iframes live in one fixed layer (<MediaStage/>) so they never
 * reload. Components that want to "show" the player register a slot; the stage glides to the
 * highest-priority slot that is on screen.
 */
interface Slot {
  el: HTMLElement;
  priority: number;
}
const slots = new Map<string, Slot>();

export function activeSlot(): HTMLElement | null {
  let best: Slot | null = null;
  for (const s of slots.values()) {
    if (!s.el.isConnected) continue;
    const r = s.el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (!best || s.priority > best.priority) best = s;
  }
  return best?.el ?? null;
}

export function useMediaSlot(name: string, priority: number) {
  const ref = useRef<HTMLElement | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      if (ref.current && slots.get(name)?.el === ref.current) slots.delete(name);
      ref.current = el;
      if (el) slots.set(name, { el, priority });
    },
    [name, priority],
  );
}
