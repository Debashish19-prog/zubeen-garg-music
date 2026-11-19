import fs from 'node:fs';
import path from 'node:path';
import { DB } from './catalog';

/**
 * Optional: find a full-length YouTube video for a song through the official YouTube Data API.
 * Only active when YOUTUBE_API_KEY is set. Each lookup costs 100 quota units (10,000/day by default),
 * so every answer, including "nothing found", is cached in data/yt-cache.json.
 */
const FILE = path.join(process.cwd(), 'data', 'yt-cache.json');
const g = globalThis as unknown as { __zgYt?: Record<string, string> };
const cache: Record<string, string> =
  g.__zgYt ??
  (g.__zgYt = (() => {
    try {
      return JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, string>;
    } catch {
      return {};
    }
  })());

export const resolverEnabled = () => !!process.env.YOUTUBE_API_KEY;

const inflight = new Map<number, Promise<string>>();

export async function resolveYouTube(id: number): Promise<string> {
  const s = DB.songs[id];
  if (!s) return '';
  if (s.yt) return s.yt;
  if (id in cache) return cache[id];
  if (!resolverEnabled()) return '';
  const running = inflight.get(id);
  if (running) return running;
  const p = (async () => {
    const album = DB.albums[s.a].n;
    const q = `Zubeen Garg ${s.t.replace(/\(.*?\)/g, ' ')} ${album !== s.t ? album : ''}`.replace(/\s+/g, ' ').trim();
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '5', videoEmbeddable: 'true', q, key: process.env.YOUTUBE_API_KEY! }).toString();
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error('YouTube API ' + r.status);
    const j = (await r.json()) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] };
    // prefer a result whose title contains the song title; skip jukeboxes and covers
    const t = s.t.toLowerCase().replace(/\(.*?\)/g, '').trim();
    const items = (j.items || []).filter((it) => !/jukebox|karaoke|cover by|non.?stop|mashup|reaction/i.test(it.snippet.title));
    const best = items.find((it) => it.snippet.title.toLowerCase().includes(t)) || items[0];
    const vid = best?.id.videoId || '';
    cache[id] = vid;
    try {
      fs.writeFileSync(FILE, JSON.stringify(cache));
    } catch {
      /* best effort */
    }
    return vid;
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}
