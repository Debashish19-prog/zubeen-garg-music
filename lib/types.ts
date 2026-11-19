export type SourceKey = 'tg' | 'yt' | 'pv' | 'sp' | 'sa';

/** One song, as the API sends it to the browser. Short keys keep list payloads small. */
export interface Song {
  id: number;
  /** title */ t: string;
  /** language */ l: string;
  /** year (0 = unknown) */ y: number;
  /** album id */ a: number;
  /** album name */ an: string;
  /** kind: Film songs, Album songs, Releases, ... */ k: string;
  /** music director / composer */ m: string;
  /** lyricist */ w: string;
  /** co-singers */ c: string;
  /** where the song was listed: Wikipedia, JioSaavn, Apple Music, MusicBrainz */ src: string;
  /** note from Wikipedia */ n: string;
  /** duration in seconds (0 = unknown) */ d: number;
  /** YouTube video id (full song) */ yt: string;
  /** Spotify track id */ sp: string;
  /** Apple Music 30-second preview URL */ pv: string;
  /** JioSaavn album id (album widget) */ sa: string;
  /** full song the owner uploaded to Telegram, streamed by this site: /api/stream/<key> ('' = none) */ tg: string;
  /** artwork (song's own, else its album's) */ img: string;
  /** external links, label -> url */ L: Record<string, string>;
}

export interface Album {
  id: number;
  n: string;
  l: string;
  y: number;
  img: string;
  sa: string;
  /** dominant kind */ k: string;
  /** number of songs */ ns: number;
}

export interface Person {
  n: string;
  count: number;
  roles: string[];
}

/** A list of songs: all ids (for queueing), plus the first page of full song objects. */
export interface ListPayload {
  ids: number[];
  songs: Song[];
  duration: number;
  playable: number;
}

export interface ListFilters {
  sort?: 'year' | 'new' | 'az' | 'none';
  play?: '' | 'any' | 'full' | 'none';
  kind?: string;
  lang?: string;
  dec?: string;
  q?: string;
}

export type ListType = 'all' | 'lang' | 'decade' | 'col' | 'album' | 'person' | 'ids' | 'uploads';

export interface SearchPayload {
  q: string;
  top: { kind: 'song'; song: Song } | { kind: 'album'; album: Album } | { kind: 'person'; person: Person } | null;
  songs: Song[];
  songIds: number[];
  albums: Album[];
  people: Person[];
}

export interface Playlist {
  id: string;
  name: string;
  desc: string;
  songs: { id: number; at: number }[];
  createdAt: number;
  updatedAt: number;
}

export interface RecentContext {
  href: string;
  label: string;
  sub: string;
  img: string;
  kind: string;
  at: number;
}

export interface Library {
  likes: { id: number; at: number }[];
  playlists: Playlist[];
  history: { id: number; at: number }[];
  recents: RecentContext[];
}

/** What the player is playing from (shown in the queue and the now-playing view). */
export interface PlayContext {
  key: string;
  label: string;
  href?: string;
  img?: string;
  kind?: string;
}

export interface NavData {
  songs: number;
  albums: number;
  playable: number;
  languages: number;
  firstYear: number;
  lastYear: number;
  collections: { key: string; name: string; count: number }[];
  langs: { name: string; count: number }[];
  decades: { d: number; count: number }[];
}
