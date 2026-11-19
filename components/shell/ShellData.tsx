'use client';
import { createContext, useContext } from 'react';
import type { NavData } from '@/lib/types';

export const ShellDataContext = createContext<NavData>({ songs: 0, albums: 0, playable: 0, languages: 0, firstYear: 0, lastYear: 0, collections: [], langs: [], decades: [] });
export const useShellData = () => useContext(ShellDataContext);

/** Map a page URL to the player-context key used for "now playing from" highlighting. */
export function ctxKeyFromHref(href: string): string {
  const [, a, b] = href.split('?')[0].split('/').map(decodeURIComponent);
  switch (a) {
    case 'album': return 'album:' + b;
    case 'collection': return 'col:' + b;
    case 'language': return 'lang:' + b;
    case 'decade': return 'decade:' + b;
    case 'person': return 'person:' + b;
    case 'playlist': return 'playlist:' + b;
    case 'liked': return 'liked';
    case 'uploads': return 'uploads';
    case 'songs': return 'all';
    case '': return 'col:essentials';
  }
  return href;
}
