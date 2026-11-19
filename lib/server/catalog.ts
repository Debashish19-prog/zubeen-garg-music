import fs from 'node:fs';
import path from 'node:path';
import { hash, norm, skel } from '@/lib/text';
import { COLLECTIONS, LABEL_KIND, MIXES, isPlayable } from '@/lib/meta';
import type { Album, ListFilters, ListPayload, ListType, NavData, Person, SearchPayload, Song } from '@/lib/types';
import { UPLOAD_BASE, coverUrl, streamUrl, uploadsSnapshot, type UploadRec } from './uploadStore';

/* ------------------------------------------------------------------ raw catalogue */

interface RawSong extends Omit<Song, 'id' | 'an'> {
  i: number;
  col: string[];
  ownImg: string;
  _h: string;
  _ht: string;
  _skt: string;
  _sk: string;
  /** /api/stream/<key> when the owner uploaded this song to Telegram */
  tg: string;
  /** album name for uploaded songs that aren't in the catalogue (they have no album page: a = -1) */
  anx?: string;
  /** catalogue duration and artwork before an upload filled them in */
  _d0?: number;
  _img0?: string;
}
interface RawAlbum {
  i: number;
  n: string;
  l: string;
  y: number;
  img: string;
  sa: string;
  k: string;
  ns: number;
  songs: number[];
  _h: string;
  _sk: string;
}
interface PersonRec {
  n: string;
  ids: Set<number>;
  roles: Set<string>;
}

function load() {
  const file = path.join(process.cwd(), 'data', 'catalog.json');
  const RAW = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    fields: string[];
    songs: unknown[][];
    albums: [string, string, number, string, string, string, number][];
    credits: string[][];
  };
  const F = RAW.fields;
  const albums: RawAlbum[] = RAW.albums.map((r, i) => ({ i, n: r[0], l: r[1], y: r[2], img: r[3], sa: r[4], k: r[5], ns: r[6], songs: [], _h: '', _sk: '' }));
  const songs: RawSong[] = RAW.songs.map((r, i) => {
    const o: Record<string, unknown> = { i };
    F.forEach((f, j) => (o[f] = r[j]));
    const s = o as unknown as RawSong;
    s.ownImg = s.img;
    s.img = s.img || albums[s.a].img;
    s.L = s.L || {};
    s.col = s.col || [];
    s.tg = '';
    return s;
  });
  songs.forEach((s) => albums[s.a].songs.push(s.i));
  songs.forEach((s) => {
    const an = albums[s.a].n;
    s._h = norm([s.t, an, s.c, s.m, s.w, s.l].join(' '));
    s._ht = norm(s.t);
    s._skt = skel(s.t);
    s._sk = skel(s.t + ' ' + an);
  });
  albums.forEach((a) => {
    a._h = norm(a.n);
    a._sk = skel(a.n);
  });

  const langs: Record<string, number[]> = {};
  songs.forEach((s) => (langs[s.l] = langs[s.l] || []).push(s.i));
  const langOrder = Object.keys(langs).sort((a, b) => Number(a === 'Unspecified') - Number(b === 'Unspecified') || langs[b].length - langs[a].length);
  const decOf = (y: number) => (y ? Math.floor(y / 10) * 10 : 0);
  const decs: Record<string, number[]> = {};
  songs.forEach((s) => (decs[decOf(s.y)] = decs[decOf(s.y)] || []).push(s.i));
  const decOrder = Object.keys(decs).map(Number).filter(Boolean).sort();

  const colTests: Record<string, (s: RawSong) => boolean> = {
    film: (s) => s.k === 'Film songs',
    bihu: (s) => s.col.includes('bihu'),
    devotional: (s) => s.col.includes('devotional'),
    folk: (s) => s.col.includes('folk'),
    theatre: (s) => s.k === 'Theatre songs',
    tv: (s) => s.k === 'TV & web series' || s.k === 'Theme songs',
    unplugged: (s) => s.col.includes('unplugged'),
    remix: (s) => s.col.includes('remix'),
  };
  const cols: Record<string, number[]> = {};
  for (const k in colTests) cols[k] = songs.filter(colTests[k]).map((s) => s.i);

  const ESS: [string, string][] = [
    ['Mayabini Ratir Bukut', 'Daag'], ['Ya Ali', 'Gangster'], ['Dil Tu Hi Bataa', 'Krrish 3'], ['Subah Subah', 'I See You'],
    ['Hahile Tumi (Anamika)', 'Anamika'], ['Pakhi Pakhi Ai Mon', 'Pakhi'], ['Junaki Mon', 'Junaki Mon'], ['Roi Roi Binaale', 'Xabda'],
    ['Mayabini', 'Tumi'], ['Kanchanjangha', 'Kanchanjangha'], ['Ei Mayabi Raati', 'Joddha'], ['Ki Naam Di Maatim', 'Dr. Bezbaruah 2'],
    ['Mon Jai', 'Jaanmoni And Anjaana'], ['Hiya Diya Niya (Theme)', 'Hiya Diya Niya'], ['Bukute Gupute', 'Pakhi'], ['Nibir Junaki Rati', 'Sopunor Sur'],
    ['Tumi Moromore', 'Priya O Priya'], ['Xopun Xopun', 'Roi Roi Binale'], ['Roi Roi Binale (Title Track)', 'Roi Roi Binale'], ['Free bird', 'Roi Roi Binale'],
  ];
  const essentials = ESS.map(([t, a]) => songs.find((s) => norm(s.t) === norm(t) && norm(albums[s.a].n) === norm(a))).filter(Boolean).map((s) => s!.i);

  const playableIds = songs.filter(isPlayable).map((s) => s.i);
  const years = songs.map((s) => s.y).filter((y) => y && y <= 2030);

  return {
    songs,
    albums,
    credits: RAW.credits,
    langs,
    langOrder,
    decs,
    decOrder,
    decOf,
    cols,
    essentials,
    playableIds,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
    people: null as Record<string, PersonRec> | null,
    /** uploaded songs that aren't in the catalogue, by id (UPLOAD_BASE and up) */
    extras: new Map<number, RawSong>(),
    /** catalogue songs that have an uploaded file */
    tgIds: [] as number[],
    /** song ids of every upload, newest first */
    uploadIds: [] as number[],
  };
}

type DBT = ReturnType<typeof load>;
const g = globalThis as unknown as { __zgdb?: DBT };
export const DB: DBT = g.__zgdb ?? (g.__zgdb = load());
if (!DB.extras) Object.assign(DB, { extras: new Map(), tgIds: [], uploadIds: [] }); // a DB cached by an older build
applyUploads();

/** A song by id: catalogue songs are indexed by position, uploaded extras live in their own map. */
export function songAt(i: number): RawSong | undefined {
  return i >= UPLOAD_BASE ? DB.extras.get(i) : DB.songs[i];
}
function allSongs(): RawSong[] {
  return DB.extras.size ? [...DB.songs, ...DB.extras.values()] : DB.songs;
}

/* ------------------------------------------------------------------ uploads overlay */

function extraSong(r: UploadRec): RawSong {
  const t = r.t || r.fileName.replace(/\.[a-z0-9]+$/i, '');
  const an = r.an || '';
  const s: RawSong = {
    i: r.id, t, l: r.l || 'Unspecified', y: r.y || 0, a: -1, anx: an, k: an ? 'Album songs' : 'Singles', m: r.m || '', w: r.w || '', c: r.c || '',
    src: 'Upload', n: '', d: Math.round(r.d || 0), yt: '', sp: '', pv: '', sa: '', img: coverUrl(r), L: {}, col: [], ownImg: coverUrl(r), tg: streamUrl(r),
    _h: '', _ht: '', _skt: '', _sk: '',
  };
  s._h = norm([s.t, an, s.c, s.m, s.w, s.l].join(' '));
  s._ht = norm(s.t);
  s._skt = skel(s.t);
  s._sk = skel(s.t + ' ' + an);
  return s;
}

/** Re-applies data/uploads.json to the in-memory catalogue. Called at start-up and after every upload change. */
export function applyUploads() {
  for (const i of DB.tgIds) {
    const s = DB.songs[i];
    if (!s) continue;
    s.tg = '';
    if (s._d0 !== undefined) s.d = s._d0;
    if (s._img0 !== undefined) s.img = s._img0;
  }
  DB.extras.clear();
  DB.tgIds = [];
  const recs = [...uploadsSnapshot()].sort((a, b) => b.at - a.at);
  for (const r of recs) {
    if (r.cat) {
      const s = DB.songs[r.id];
      if (!s || s.tg) continue;
      s._d0 = s.d;
      s._img0 = s.img;
      s.tg = streamUrl(r);
      if (!s.d && r.d) s.d = Math.round(r.d);
      if (!s.img && r.coverMsgId) s.img = coverUrl(r);
      DB.tgIds.push(r.id);
    } else DB.extras.set(r.id, extraSong(r));
  }
  DB.uploadIds = recs.map((r) => r.id).filter((id, k, a) => a.indexOf(id) === k && !!songAt(id));
  DB.playableIds = DB.songs.filter(isPlayable).map((s) => s.i);
}

/* ------------------------------------------------------------------ DTOs */

export function toSong(s: RawSong): Song {
  return {
    id: s.i, t: s.t, l: s.l, y: s.y, a: s.a, an: s.a >= 0 ? DB.albums[s.a].n : s.anx || '', k: s.k, m: s.m, w: s.w, c: s.c, src: s.src, n: s.n,
    d: s.d, yt: s.yt, sp: s.sp, pv: s.pv, sa: s.sa, tg: s.tg || '', img: s.img, L: s.L,
  };
}
export const songDTO = (id: number) => {
  const s = songAt(id);
  return s ? toSong(s) : null;
};
export const songsDTO = (ids: number[]) => ids.map(songAt).filter((s): s is RawSong => !!s).map(toSong);

export function toAlbum(a: RawAlbum): Album {
  return { id: a.i, n: a.n, l: a.l, y: a.y, img: a.img, sa: a.sa, k: a.k, ns: a.ns };
}
export const albumDTO = (id: number) => (DB.albums[id] ? toAlbum(DB.albums[id]) : null);

/* ------------------------------------------------------------------ people */

export function people(): Record<string, PersonRec> {
  if (DB.people) return DB.people;
  const P: Record<string, PersonRec> = {};
  const add = (name: string, role: string, i: number) => {
    name = name.replace(/\s+/g, ' ').trim();
    if (!name || name.length < 3 || /^(solo|unknown|various|n\/a|zubeen garg|zubeen)$/i.test(name)) return;
    const p = P[name] || (P[name] = { n: name, ids: new Set(), roles: new Set() });
    p.ids.add(i);
    p.roles.add(role);
  };
  const split = (v: string) => String(v || '').split(/,|&|\band\b|\//);
  DB.songs.forEach((s) => {
    split(s.c).forEach((n) => add(n, s.k === LABEL_KIND ? 'Singer' : 'Co-singer', s.i));
    split(s.m).forEach((n) => add(n, 'Music', s.i));
    split(s.w).forEach((n) => add(n, 'Lyrics', s.i));
  });
  DB.people = P;
  return P;
}
export const toPerson = (p: PersonRec): Person => ({ n: p.n, count: p.ids.size, roles: [...p.roles] });

export function topPeople(role: string, n = 30): Person[] {
  return Object.values(people())
    .filter((p) => p.roles.has(role))
    .sort((a, b) => b.ids.size - a.ids.size)
    .slice(0, n)
    .map(toPerson);
}

/* ------------------------------------------------------------------ mixes (seeded per day) */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(ids: number[], key: string) {
  const day = new Date().toISOString().slice(0, 10);
  const r = rng(hash(day + key));
  const o = ids.slice();
  for (let k = o.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [o[k], o[j]] = [o[j], o[k]];
  }
  return o;
}
function mixIds(key: string): number[] {
  const P = DB.playableIds.map((i) => DB.songs[i]).filter((s) => s.k !== LABEL_KIND); // his own songs only
  switch (key) {
    case 'mix-daily': return seededShuffle(P.map((s) => s.i), key).slice(0, 50);
    case 'mix-full': return seededShuffle(P.filter((s) => s.yt || s.sp).map((s) => s.i), key);
    case 'mix-duets': return seededShuffle(P.filter((s) => s.c && (s.yt || s.pv || s.sp)).map((s) => s.i), key).slice(0, 60);
    case 'mix-90s': return seededShuffle(P.filter((s) => s.y >= 1990 && s.y < 2000).map((s) => s.i), key).slice(0, 60);
    case 'mix-hindi': return seededShuffle(P.filter((s) => s.l === 'Hindi').map((s) => s.i), key).slice(0, 60);
    case 'mix-deep': return seededShuffle(P.filter((s) => s.src !== 'Wikipedia' && s.pv).map((s) => s.i), key).slice(0, 50);
  }
  return [];
}

export function collectionIds(key: string): number[] | null {
  if (key === 'essentials') return DB.essentials;
  if (key.startsWith('mix-')) return MIXES.some((m) => m.key === key) ? mixIds(key) : null;
  return DB.cols[key] ?? null;
}

/* ------------------------------------------------------------------ lists */

export function baseIds(type: ListType, key: string): number[] | null {
  switch (type) {
    case 'all': return allSongs().map((s) => s.i);
    case 'lang': return DB.langs[key] ? [...DB.langs[key], ...[...DB.extras.values()].filter((s) => s.l === key).map((s) => s.i)] : null;
    case 'decade': return DB.decs[key] ? [...DB.decs[key], ...[...DB.extras.values()].filter((s) => String(DB.decOf(s.y)) === key).map((s) => s.i)] : null;
    case 'col': return collectionIds(key);
    case 'album': {
      const a = DB.albums[+key];
      return a ? a.songs.slice().sort((x, y) => (DB.songs[x].y || 0) - (DB.songs[y].y || 0)) : null;
    }
    case 'person': {
      const p = people()[key];
      return p ? [...p.ids] : null;
    }
    case 'ids': return key.split(',').map(Number).filter((n) => Number.isInteger(n) && !!songAt(n));
    case 'uploads': return DB.uploadIds.slice();
  }
  return null;
}

export function filterIds(base: number[], f: ListFilters): number[] {
  const q = norm(f.q), sq = skel(f.q || '');
  const ids = base.filter((i) => {
    const s = songAt(i);
    if (!s) return false;
    if (f.lang && s.l !== f.lang) return false;
    if (f.dec && String(DB.decOf(s.y)) !== f.dec) return false;
    if (f.kind && s.k !== f.kind) return false;
    if (f.play === 'any' && !isPlayable(s)) return false;
    if (f.play === 'full' && !(s.tg || s.yt || s.sa || s.sp)) return false;
    if (f.play === 'none' && isPlayable(s)) return false;
    if (q && !s._h.includes(q) && !(sq.length >= 4 && s._sk.includes(sq))) return false;
    return true;
  });
  const S = (i: number) => songAt(i)!;
  const by: Record<string, (a: number, b: number) => number> = {
    year: (a, b) => (S(a).y || 9999) - (S(b).y || 9999) || S(a).t.localeCompare(S(b).t),
    new: (a, b) => (S(b).y || 0) - (S(a).y || 0) || S(a).t.localeCompare(S(b).t),
    az: (a, b) => S(a).t.localeCompare(S(b).t),
  };
  if (f.sort && f.sort !== 'none' && by[f.sort]) ids.sort(by[f.sort]);
  return ids;
}

export function listPayload(ids: number[], first = 100): ListPayload {
  let duration = 0, playable = 0;
  for (const i of ids) {
    const s = songAt(i);
    if (!s) continue;
    duration += s.d || 0;
    if (isPlayable(s)) playable++;
  }
  return { ids, songs: songsDTO(ids.slice(0, first)), duration, playable };
}

/* ------------------------------------------------------------------ albums */

export function queryAlbums(f: { lang?: string; dec?: string; kind?: string; sort?: string; q?: string }) {
  const q = norm(f.q), sq = skel(f.q || '');
  const list = DB.albums.filter(
    (a) =>
      (!f.lang || a.l === f.lang) &&
      (!f.dec || String(DB.decOf(a.y)) === f.dec) &&
      (!f.kind || a.k === f.kind) &&
      (!q || a._h.includes(q) || (sq.length >= 4 && a._sk.includes(sq))),
  );
  const by: Record<string, (a: RawAlbum, b: RawAlbum) => number> = {
    songs: (a, b) => b.ns - a.ns || (b.img ? 1 : 0) - (a.img ? 1 : 0),
    old: (a, b) => (a.y || 9999) - (b.y || 9999),
    new: (a, b) => (b.y || 0) - (a.y || 0),
    az: (a, b) => a.n.localeCompare(b.n),
  };
  list.sort(by[f.sort || 'songs'] || by.songs);
  return list;
}

/* ------------------------------------------------------------------ search */

export function search(q: string): SearchPayload {
  const nq = norm(q), sq = skel(q);
  if (!nq) return { q, top: null, songs: [], songIds: [], albums: [], people: [] };
  const scored: [number, number][] = [];
  for (const s of allSongs()) {
    let sc = 0;
    if (s._ht === nq) sc = 100;
    else if (s._ht.startsWith(nq)) sc = 80;
    else if (s._ht.includes(nq)) sc = 60;
    else if (sq.length >= 4 && s._skt.startsWith(sq)) sc = 55;
    else if (sq.length >= 4 && s._skt.includes(sq)) sc = 45;
    else if (s._h.includes(nq)) sc = 40;
    else if (sq.length >= 4 && s._sk.includes(sq)) sc = 30;
    if (sc) scored.push([sc + (s.tg ? 8 : isPlayable(s) ? 5 : 0) + (s.img ? 1 : 0), s.i]);
  }
  scored.sort((a, b) => b[0] - a[0] || songAt(a[1])!.t.localeCompare(songAt(b[1])!.t));
  const songIds = scored.map((x) => x[1]);

  const albumScore = (a: RawAlbum) => (a._h === nq ? 100 : a._h.startsWith(nq) ? 80 : a._h.includes(nq) ? 60 : sq.length >= 4 && a._sk.includes(sq) ? 40 : 0);
  const al = DB.albums
    .map((a) => [albumScore(a), a] as const)
    .filter(([sc]) => sc > 0)
    .sort((x, y) => y[0] - x[0] || y[1].ns - x[1].ns)
    .slice(0, 20);
  const ppl = Object.values(people())
    .map((p) => {
      const n = norm(p.n);
      return [n === nq ? 100 : n.startsWith(nq) ? 80 : n.includes(nq) ? 60 : 0, p] as const;
    })
    .filter(([sc]) => sc > 0)
    .sort((x, y) => y[0] - x[0] || y[1].ids.size - x[1].ids.size)
    .slice(0, 14);

  let top: SearchPayload['top'] = null;
  const bestSong = scored[0]?.[0] ?? 0, bestAlbum = al[0]?.[0] ?? 0, bestPerson = ppl[0]?.[0] ?? 0;
  if (bestPerson >= 80 && bestPerson > bestSong) top = { kind: 'person', person: toPerson(ppl[0][1]) };
  else if (bestAlbum >= 80 && bestAlbum + 6 > bestSong && al[0][1].ns > 1) top = { kind: 'album', album: toAlbum(al[0][1]) };
  else if (scored.length) top = { kind: 'song', song: toSong(songAt(scored[0][1])!) };

  return {
    q,
    top,
    songs: songsDTO(songIds.slice(0, 60)),
    songIds,
    albums: al.map(([, a]) => toAlbum(a)),
    people: ppl.map(([, p]) => toPerson(p)),
  };
}

/* ------------------------------------------------------------------ nav + home */

export function navData(): NavData {
  return {
    songs: DB.songs.length,
    albums: DB.albums.length,
    playable: DB.playableIds.length,
    languages: DB.langOrder.filter((l) => l !== 'Unspecified').length,
    firstYear: DB.firstYear,
    lastYear: DB.lastYear,
    collections: [...COLLECTIONS, ...MIXES].map((c) => ({ key: c.key, name: c.name, count: collectionIds(c.key)?.length ?? 0 })),
    langs: DB.langOrder.map((l) => ({ name: l, count: DB.langs[l].length })),
    decades: DB.decOrder.map((d) => ({ d, count: DB.decs[d].length })),
  };
}

export function homeData() {
  const A = DB.albums;
  const real = (a: RawAlbum) => a.ns > 0;
  const pick = (list: RawAlbum[], n = 18) => list.slice(0, n).map(toAlbum);
  return {
    essentials: songsDTO(DB.essentials),
    films: pick(A.filter((a) => a.k === 'Film songs' && real(a)).sort((a, b) => b.ns - a.ns || (b.img ? 1 : 0) - (a.img ? 1 : 0))),
    albums: pick(A.filter((a) => a.k === 'Album songs').sort((a, b) => b.ns - a.ns)),
    big: pick(A.filter((a) => a.ns >= 8).sort((a, b) => b.ns - a.ns)),
    recent: pick(A.filter((a) => a.y >= 2024 && a.img).sort((a, b) => b.y - a.y || b.ns - a.ns)),
    singles: pick(A.filter((a) => (a.k === 'Singles' || a.k === 'Releases') && a.img && a.ns === 1).sort((a, b) => b.y - a.y)),
    nineties: pick(A.filter((a) => a.y && a.y < 2000 && a.img).sort((a, b) => a.y - b.y)),
    bihu: songsDTO(DB.cols.bihu.filter((i) => isPlayable(DB.songs[i])).slice(0, 18)),
    langs: DB.langOrder.filter((l) => l !== 'Unspecified').slice(0, 10).map((l) => ({ name: l, count: DB.langs[l].length })),
    decades: DB.decOrder.map((d) => ({ d, count: DB.decs[d].length })),
  };
}
